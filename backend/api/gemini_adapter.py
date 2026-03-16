import logging
import os
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("VERTEX_PROJECT_ID", "sc-soundsight")
LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")
MODEL_ID = os.getenv("VERTEX_MODEL_ID", "gemini-2.5-flash")


def init_vertex_ai() -> genai.Client:
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS is not set")

    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
        )
        return client
    except Exception as e:
        raise RuntimeError(f"Google Gen AI client initialization failed: {e}") from e


def _strip_code_fences(text: str) -> str:
    text = (text or "").strip()

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


def _extract_response_text(response: Any) -> str:
    """
    google-genai response에서 텍스트를 최대한 안전하게 꺼낸다.
    """
    # 가장 먼저 text shortcut
    text = getattr(response, "text", None)
    if text and str(text).strip():
        return str(text).strip()

    # candidates/content/parts fallback
    candidates = getattr(response, "candidates", None) or []
    collected: list[str] = []

    for cand in candidates:
        content = getattr(cand, "content", None)
        if not content:
            continue

        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text and str(part_text).strip():
                collected.append(str(part_text).strip())

    return "\n".join(collected).strip()


def _build_segment_prompt(segment: dict[str, Any]) -> str:
    feats = segment.get("features", {})
    start = segment.get("start_time_sec", 0.0)
    end = segment.get("end_time_sec", 0.0)

    return (
        "Return exactly one line only in this format:\n"
        "base_mood|dynamic_event|intensity\n"
        "No JSON. No markdown. No code fences. No explanation.\n"
        "Allowed base_mood: tension,sorrow,uplift,warmth,unknown\n"
        "Allowed dynamic_event: stable,jump_scare,swell,sudden_drop\n"
        "Intensity must be a number from 0.0 to 1.0\n"
        f"start={start}, end={end}, "
        f"energy={feats.get('mean_energy', 0.0)}, "
        f"centroid={feats.get('mean_spectral_centroid', 0.0)}, "
        f"tempo={feats.get('tempo_bpm', 0.0)}, "
        f"events={feats.get('event_count', 0)}"
    )


def _coerce_segment_result(parsed: dict[str, Any]) -> dict[str, Any]:
    base_mood = str(parsed.get("base_mood", "unknown"))
    dynamic_event = str(parsed.get("dynamic_event", "stable"))

    try:
        intensity = float(parsed.get("intensity", 0.5))
    except (TypeError, ValueError):
        intensity = 0.5

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


def _parse_pipe_result(text: str) -> dict[str, Any]:
    cleaned = _strip_code_fences(text).strip()

    if not cleaned:
        raise ValueError("Gemini returned empty response")

    first_line = cleaned.splitlines()[0].strip()
    parts = [p.strip() for p in first_line.split("|")]

    # 너무 짧게 잘린 경우도 일부 salvage
    if len(parts) == 1 and parts[0]:
        return _coerce_segment_result(
            {
                "base_mood": parts[0],
                "dynamic_event": "stable",
                "intensity": 0.5,
            }
        )

    if len(parts) != 3:
        raise ValueError(f"Gemini returned invalid pipe format: {cleaned[:200]}")

    base_mood, dynamic_event, intensity_raw = parts

    if not dynamic_event:
        dynamic_event = "stable"

    try:
        intensity = float(intensity_raw) if intensity_raw else 0.5
    except (TypeError, ValueError):
        intensity = 0.5

    return _coerce_segment_result(
        {
            "base_mood": base_mood,
            "dynamic_event": dynamic_event,
            "intensity": intensity,
        }
    )


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


def _call_gemini_for_segment(client: genai.Client, segment: dict[str, Any]) -> dict[str, Any]:
    prompt = _build_segment_prompt(segment)

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=128,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=0
                ),
            ),
        )
    except Exception as e:
        raise RuntimeError(f"Gemini request failed: {e}") from e

    raw_text = _extract_response_text(response)

    logger.info("Gemini raw response for segment %s: %r", segment.get("segment_id"), raw_text)

    return _parse_pipe_result(raw_text)


def call_gemini_timeline(audio_features: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Calls Gemini once per segment.
    If Gemini fails for a segment, falls back to rule-based output for that segment only.
    Returns a normalized timeline list.
    """
    client = init_vertex_ai()

    segments = audio_features.get("segments", [])
    if not segments:
        return []

    results: list[dict[str, Any]] = []
    prev_mood: str | None = None

    for idx, seg in enumerate(segments):
        logger.info("Calling Gemini for segment %d/%d", idx + 1, len(segments))

        try:
            item = _call_gemini_for_segment(client, seg)
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