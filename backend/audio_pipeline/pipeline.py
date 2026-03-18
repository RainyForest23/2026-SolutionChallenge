# overall flow 
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict, List

from .ffmpeg_utils import convert_to_wav, get_duration_seconds, split_wav_segments
from .youtube import download_youtube_audio
from .utils import ensure_dir

# 전체 오디오 파이프라인을 실행하는 함수: YouTube URL -> audio file -> wav -> segments
def run_audio_pipeline(
    *,
    youtube_url: str,
    workdir: str | Path,
    job_id: str,
    segment_sec: int = 10,
    preferred_audio_ext: str = "m4a",
    sample_rate: int = 16000,
    channels: int = 1,
) -> Dict[str, Any]:
    """
    Process:
      YouTube URL -> audio file -> wav -> segments

    Returns:
      {
        "audio_path": ".../audio.m4a",
        "wav_path": ".../audio.wav",
        "segments_dir": ".../segments",
        "segment_paths": [".../seg_000.wav", ...],
        "duration_sec": 123.4 | None
      }
    """
    base_dir = ensure_dir(Path(workdir) / job_id)

    # YouTube에서 오디오 다운로드 
    audio_path = download_youtube_audio(
        youtube_url=youtube_url,
        workdir=workdir,
        job_id=job_id,
        preferred_ext=preferred_audio_ext,
    )

    # 다운로드된 오디오를 WAV 형식으로 변환
    wav_path = convert_to_wav(
        input_audio_path=audio_path,
        output_wav_path=base_dir / "audio.wav",
        sample_rate=sample_rate,
        channels=channels,
    )

    # WAV 파일을 일정 길이의 세그먼트로 분할
    segments_dir = ensure_dir(base_dir / "segments")
    seg_paths = split_wav_segments(
        input_wav_path=wav_path,
        segments_dir=segments_dir,
        segment_sec=segment_sec,
    )

    # 전체 오디오 길이
    duration = get_duration_seconds(audio_path) or get_duration_seconds(wav_path)

    # 결과 반환
    return {
        "audio_path": str(audio_path),
        "wav_path": str(wav_path),
        "segments_dir": str(segments_dir),
        "segment_paths": [str(p) for p in seg_paths],
        "duration_sec": duration,
    }


# CLI로도 실행할 수 있도록 하는 main 함수

# Docker Compose에서 실행하는 예시:
# docker compose exec backend python -m backend.audio_pipeline.pipeline \
#   --url "https://www.youtube.com/watch?v=gIHjXDxghqE" \
#   --job-id "test_interstellar" \
#   --workdir "/tmp/soundsight" \
#   --segment-sec 10


# 로컬에서 직접 실행하는 예시:
# python -m backend.audio_pipeline.pipeline \
#   --url "https://www.youtube.com/watch?v=gIHjXDxghqE" \
#   --job-id "test_interstellar" \
#   --workdir "/tmp/soundsight" \
#   --segment-sec 10
def _main():
    parser = argparse.ArgumentParser(description="SoundSight audio pipeline CLI")
    parser.add_argument("--url", required=True, help="YouTube URL")
    parser.add_argument("--job-id", default="local_test", help="Job ID folder name")
    parser.add_argument("--workdir", default="/tmp/soundsight", help="Working directory")
    parser.add_argument("--segment-sec", type=int, default=10, help="Segment length in seconds")
    args = parser.parse_args()

    out = run_audio_pipeline(
        youtube_url=args.url,
        workdir=args.workdir,
        job_id=args.job_id,
        segment_sec=args.segment_sec,
    )
    print(out)


if __name__ == "__main__":
    _main()