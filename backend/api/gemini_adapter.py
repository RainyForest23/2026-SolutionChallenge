import json
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# add ai-pipeline folder to Python path
sys.path.append(str(Path(__file__).resolve().parents[1] / "ai-pipeline"))

from test_gemini_prompt import init_vertex_ai, generate_emotion_timeline

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


def call_gemini_timeline(audio_features: dict) -> list[dict]:
    """
    Calls AI team's Gemini function and returns parsed JSON list.
    """
    ok = init_vertex_ai()
    if not ok:
        raise RuntimeError("Vertex AI initialization failed")

    raw_text = generate_emotion_timeline(
        video_path="unused_for_now",
        audio_features=audio_features,
    )

    cleaned = _strip_code_fences(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.exception("Gemini returned invalid JSON: %s", cleaned)
        raise ValueError(f"Gemini returned invalid JSON: {cleaned}") from e

    if not isinstance(parsed, list):
        raise ValueError("Gemini output must be a list")

    return parsed