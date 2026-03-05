# 다운로드된 오디오를 16kHzWAV 형식으로 변환하고, ffmpeg의 segment muxer를 사용해서 일정 길이의 WAV 세그먼트 파일들로 분할

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from .exceptions import FfmpegError
from .utils import ensure_dir, run_cmd, which

# ffmpeg를 사용해서 오디오를 WAV로 변환하는 함수
def convert_to_wav(
    *,
    input_audio_path: str | Path,
    output_wav_path: str | Path,
    sample_rate: int = 16000,
    channels: int = 1,
) -> Path:
    """
    Convert audio to WAV 
    """
    in_path = Path(input_audio_path)
    out_path = Path(output_wav_path)

    # 입력 파일 존재 여부 및 ffmpeg 존재 여부 확인
    if not in_path.exists():
        raise FfmpegError(f"Input audio not found: {in_path}")
    if not which("ffmpeg"):
        raise FfmpegError("ffmpeg not found in PATH (install it in Docker/container)")

    ensure_dir(out_path.parent)
    
    # ffmpeg 명령어 구성 및 실행
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(in_path),
        "-ar",
        str(sample_rate),
        "-ac",
        str(channels),
        "-c:a",
        "pcm_s16le",
        str(out_path),
    ]

    # 명령어 실행 및 결과 확인
    res = run_cmd(cmd)
    if res.returncode != 0:
        raise FfmpegError(f"ffmpeg convert failed: {res.stderr.strip() or res.stdout.strip()}")
    if not out_path.exists():
        raise FfmpegError("ffmpeg convert reported success but output wav not found")
    
    # 변환된 WAV 파일 경로 반환
    return out_path

# ffmpeg를 사용해서 WAV 파일을 일정 길이의 세그먼트로 분할하는 함수 (여기서는 10초마다 seg_000.wav, seg_001.wav, ... 형식으로 분할)
def split_wav_segments(
    *,
    input_wav_path: str | Path,
    segments_dir: str | Path,
    segment_sec: int = 10, # 세그먼트 길이 (10초 단위)
    prefix: str = "seg_",
) -> List[Path]:
    """
    Split wav into segments using ffmpeg segment muxer
    Output:
      segments_dir/seg_000.wav, seg_001.wav, ...
    """
    in_path = Path(input_wav_path)
    out_dir = Path(segments_dir)

    # 입력 파일 존재 여부 및 ffmpeg 존재 여부 확인
    if not in_path.exists():
        raise FfmpegError(f"Input wav not found: {in_path}")
    if segment_sec <= 0:
        raise FfmpegError("segment_sec must be > 0")

    ensure_dir(out_dir)

    outtmpl = str(out_dir / f"{prefix}%03d.wav")

    # ffmpeg 명령어 구성 및 실행
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(in_path),
        "-f",
        "segment",
        "-segment_time",
        str(segment_sec),
        "-reset_timestamps",
        "1",
        "-c:a",
        "pcm_s16le",
        outtmpl,
    ]

    # 명령어 실행 및 결과 확인
    res = run_cmd(cmd)
    if res.returncode != 0:
        raise FfmpegError(f"ffmpeg split failed: {res.stderr.strip() or res.stdout.strip()}")
    segs = sorted(out_dir.glob(f"{prefix}*.wav"))
    if not segs:
        raise FfmpegError("ffmpeg split reported success but no segments were produced")

    # 생성된 세그먼트 파일 경로 리스트 반환 (예: [Path("segments/seg_000.wav"), Path("segments/seg_001.wav"), ...])
    return segs

# ffprobe를 사용해서 오디오 파일의 전체 길이(초 단위)를 읽는 함수 (ffprobe가 설치되어 있으면 사용, 없으면 None 반환)
def get_duration_seconds(input_audio_path: str | Path) -> Optional[float]:
    """
    Optional: use ffprobe to read duration
    """
    if not which("ffprobe"):
        return None
    in_path = Path(input_audio_path)
    if not in_path.exists():
        return None

    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(in_path),
    ]
    res = run_cmd(cmd)
    if res.returncode != 0:
        return None

    try:
        return float((res.stdout or "").strip())
    except Exception:
        return None