# yt-dlp 사용 -> YouTube에서 오디오를 다운로드하고, workdir/jobId/ 형태의 고정된 작업 폴더에 저장      

from __future__ import annotations

from pathlib import Path
from typing import Optional

from .exceptions import DownloadError, InvalidURLError
from .utils import ensure_dir, run_cmd, which

def download_youtube_audio(
    *,
    youtube_url: str,
    workdir: str | Path,
    job_id: str,
    preferred_ext: str = "m4a",
) -> Path:
    """
    Download best audio-only stream from YouTube using yt-dlp.
    Output:
      workdir/{job_id}/audio.{ext}  
    Returns:
      Path to downloaded audio file (actual ext).
    """
    # URL 검증 및 yt-dlp 존재 여부 확인 
    url = (youtube_url or "").strip()
    if not url:
        raise InvalidURLError("Empty YouTube URL")
    if not which("yt-dlp"):
        raise DownloadError("yt-dlp not found in PATH (install it in Docker/container)")

    # 작업 디렉토리 설정 및 yt-dlp 명령어 구성
    base_dir = ensure_dir(Path(workdir) / job_id)
    outtmpl = str(base_dir / "audio.%(ext)s")

    # yt-dlp 명령어 실행
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        preferred_ext,
        "--audio-quality",
        "0",
        "-o",
        outtmpl,
        url,
    ]

    # 명령어 실행 및 결과 확인
    res = run_cmd(cmd)
    if res.returncode != 0:
        raise DownloadError(f"yt-dlp failed: {res.stderr.strip() or res.stdout.strip()}")

    # 다운로드된 파일 찾기 
    candidates = sorted(base_dir.glob("audio.*"))
    if not candidates:
        raise DownloadError("yt-dlp reported success but no audio file found in workdir")

    # 선호하는 확장자 우선으로 파일 선택 (여기서는 m4a) -> 없으면 첫 번째 파일 반환
    preferred = [p for p in candidates if p.suffix.lower() == f".{preferred_ext.lower()}"]
    return preferred[0] if preferred else candidates[0]