# 에러 핸들링을 위한 커스텀 예외 클래스 정의
class AudioPipelineError(Exception):
    """Base exception for audio pipeline errors."""


class DownloadError(AudioPipelineError):
    """Raised when yt-dlp download fails."""


class FfmpegError(AudioPipelineError):
    """Raised when ffmpeg processing fails."""


class InvalidURLError(AudioPipelineError):
    """Raised when URL is invalid or unsupported."""