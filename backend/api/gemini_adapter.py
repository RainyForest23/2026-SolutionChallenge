import json
import logging
import os
from typing import Any

import vertexai
from vertexai.generative_models import GenerativeModel

logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("VERTEX_PROJECT_ID", "sc-soundsight")
LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")
MODEL_ID = os.getenv("VERTEX_MODEL_ID", "gemini-2.5-pro")


def init_vertex_ai() -> None:
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS is not set")

    try:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
    except Exception as e:
        raise RuntimeError(f"Vertex AI initialization failed: {e}") from e


def _strip_code_fences(text: str) -> str:
    text = text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]

        text = "\n".join(lines).strip()

        if text.lower().startswith("json"):
            text = text[4:].strip()

    return text


def _build_segment_prompt(segment: dict[str, Any]) -> str:
    return f"""
You are an emotion classifier for audiovisual accessibility.

Task:
Given the single audio segment data below, return exactly one valid JSON object.
Do not use markdown.
Do not include explanation.
Do not include extra text.
Do not include a reason field.

Allowed base_mood values:
- tension
- sorrow
- uplift
- warmth
- unknown

Allowed dynamic_event values:
- stable
- jump_scare
- swell
- sudden_drop

Output format:
{{
  "base_mood": "warmth",
  "dynamic_event": "stable",
  "intensity": 0.3
}}

Rules:
- intensity must be between 0.0 and 1.0
- use only the allowed labels
- return exactly one JSON object
- choose the most appropriate mood based on the segment features
- choose "stable" if there is no clear dynamic event

Segment:
{json.dumps(segment, ensure_ascii=False, indent=2)}
""".strip()


def _coerce_segment_result(parsed: Any) -> dict[str, Any]:
    if not isinstance(parsed, dict):
        raise ValueError("Gemini output must be a JSON object")

    base_mood = str(parsed.get("base_mood", "unknown"))
    dynamic_event = str(parsed.get("dynamic_event", "stable"))
    intensity = float(parsed.get("intensity", 0.5))

    allowed_moods = {"tension", "sorrow", "uplift", "warmth", "unknown"}
    allowed_events = {"stable", "jump_scare", "swell", "sudden_drop"}

    if base_mood not in allowed_moods:
        base_mood = "unknown"

    if dynamic_event not in allowed_events:
        dynamic_event = "stable"

    intensity = max(0.0, min(1.0, intensity))

    return {
        "base_mood": base_mood,
        "dynamic_event": dynamic_event,
        "intensity": intensity,
    }


def _rule_based_for_segment(segment: dict[str, Any]) -> dict[str, Any]:
    feats = segment.get("features", {})
    energy = feats.get("mean_energy", 0.0)
    tempo = feats.get("tempo_bpm", 0.0)
    event_count = feats.get("event_count", 0)

    if energy >= 0.12:
        base_mood = "tension"
        intensity = min(1.0, round(energy * 4, 2))
    elif tempo >= 125:
        base_mood = "uplift"
        intensity = 0.65
    elif energy <= 0.02:
        base_mood = "sorrow"
        intensity = 0.35
    else:
        base_mood = "warmth"
        intensity = 0.45

    dynamic_event = "stable"
    if event_count >= 50:
        dynamic_event = "swell"
    elif energy <= 0.01 and event_count <= 3:
        dynamic_event = "sudden_drop"

    return {
        "base_mood": base_mood,
        "dynamic_event": dynamic_event,
        "intensity": intensity,
    }


def _call_gemini_for_segment(model: GenerativeModel, segment: dict[str, Any]) -> dict[str, Any]:
    prompt = _build_segment_prompt(segment)

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": 128,
            },
        )
    except Exception as e:
        raise RuntimeError(f"Gemini request failed: {e}") from e

    raw_text = getattr(response, "text", "") or ""
    cleaned = _strip_code_fences(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.exception("Gemini returned invalid JSON for segment %s: %s", segment.get("segment_id"), cleaned[:500])
        raise ValueError(f"Gemini returned invalid JSON: {cleaned[:500]}") from e

    return _coerce_segment_result(parsed)


def call_gemini_timeline(audio_features: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Calls Gemini once per segment.
    If Gemini fails for a segment, falls back to rule-based output for that segment only.
    Returns a normalized timeline list that tasks.py can pass to normalize_gemini_timeline().
    """
    init_vertex_ai()
    model = GenerativeModel(MODEL_ID)

    segments = audio_features.get("segments", [])
    if not segments:
        return []

    results: list[dict[str, Any]] = []
    prev_mood: str | None = None

    for idx, seg in enumerate(segments):
        logger.info("Calling Gemini for segment %d/%d", idx + 1, len(segments))

        try:
            item = _call_gemini_for_segment(model, seg)
            source = "gemini"
        except Exception:
            logger.exception(
                "Gemini failed for segment %s, using rule-based fallback",
                seg.get("segment_id", idx + 1),
            )
            item = _rule_based_for_segment(seg)
            source = "rule-based"

        start_time = float(seg.get("start_time_sec", 0.0))
        end_time = float(seg.get("end_time_sec", 0.0))
        current_mood = item["base_mood"]

        shift = prev_mood is not None and current_mood != prev_mood
        prev_mood = current_mood

        results.append(
            {
                "start_time": start_time,
                "end_time": end_time,
                "base_mood": current_mood,
                "dynamic_event": item["dynamic_event"],
                "intensity": item["intensity"],
                "shift": shift,
                "source": source,
            }
        )

    return results