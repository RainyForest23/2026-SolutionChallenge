from typing import Any, Dict, Optional, List
from urllib.parse import urlparse, parse_qs

class NotFoundError(Exception):
    pass

class BadRequestError(Exception):
    pass

class ConflictError(Exception):
    pass

# youtube videoId 추출
    def extract_youtube_video_id(youtube_url: str) -> str:
        """
        지원 케이스:
        - https://www.youtube.com/watch?v=VIDEOID
        - https://m.youtube.com/watch?v=VIDEOID
        - https://youtu.be/VIDEOID
        - https://www.youtube.com/shorts/VIDEOID
        - https://www.youtube.com/embed/VIDEOID
        """
        u = youtube_url.strip()
        if not u:
            raise ValueError("Empty URL")
        
        p = urlparse(u) # scheme, hostname, path, query로 분리
        host = (p.hostname or "").lower()
        path = p.path or ""

        # youtu.be/<id>
        if host in ("youtu.be",):
            vid = path.lstrip("/").split("/")[0]
            if vid:
                return vid

        # youtube.com/watch?v=<id>
        if host.endswith("youtube.com"):
            if path == "/watch":
                qs = parse_qs(p.query)
                vid = (qs.get("v") or [None])[0]
                if vid:
                    return vid

            # /shorts/<id>, /embed/<id>
            parts = [x for x in path.split("/") if x]
            if parts and parts[0] in ("shorts", "embed"): # split 결과에서 빈 문자열 제거
                if len(parts) >= 2 and parts[1]:
                    return parts[1]

        raise ValueError("Invalid YouTube URL")
    

class VideoService:
    def __init__(self, video_repo, job_repo):
        self.video_repo = video_repo
        self.job_repo = job_repo


    # analyze 시작 전 video 생성
    def create_video(self, uid: str, title: str, youtube_url: str, duration_sec: Optional[int] = None) -> Dict[str, Any]:
        """
        video_payload: {title, youtubeUrl, durationSec(선택)}
        - 이미 동일한 video가 존재하면 반려 (기존 video에서 결과 재생성 유도)
        - 없으면 video 생성
        """
        title = (title or "").strip()
        if not title:
            raise BadRequestError("title은 필수 필드입니다.")
        
        try:
            youtube_video_id = self.extract_youtube_video_id(youtube_url)
        except ValueError:
            raise BadRequestError({"youtubeUrl": "유효한 youtube URL이 아닙니다."})
        
        # 이미 존재하는 video (youtubeVideoId로 구분) 분석 요청이 들어온 경우
        existing = self.video_repo.find_by_youtube_id(uid, youtube_video_id)
        if existing:
            raise ConflictError(f"기존에 있는 동영상입니다. existingVideoId={existing.get('videoId')}")

        video_payload: Dict[str, Any] = {
            "uid": uid,
            "title": title,
            "youtubeUrl": youtube_url,
            "youtubeVideoId": youtube_video_id
        }
        if duration_sec is not None:
            if not isinstance(duration_sec, int) or duration_sec < 0:
                raise BadRequestError("durationSec은 양수여야 합니다.")
            video_payload["durationSec"] = duration_sec

        video_id = self.video_repo.create_video(uid, video_payload)
        video = self.video_repo.get_video(uid, video_id) or {}

        return {"videoId": video_id, **video}


    # video 상세 반환
    def get_video_with_status(self, uid: str, video_id: str) -> Dict[str, Any]:
        video = self.video_repo.get_video(uid, video_id)
        if video is None:
            raise NotFoundError("Video not found")

        # 응답 형태는 프론트 요구에 맞추어 수정 가능
        return {
            "videoId": video_id,
            "status": video.get("currentStatus"),
            "video": video,
        }


    # video 목록 가져오기
    def list_videos_with_status(self, uid: str, limit: int = 50) -> List[Dict[str, Any]]:
        videos = self.video_repo.list_videos(uid, limit=limit)

        out: List[Dict[str, Any]] = []
        for v in videos:
            video_id = v["videoId"]
            out.append({
                "videoId": video_id,
                "status": v.get("currentStatus"),
                "video": v,
            })
        return out


    # job이 processing으로 들어갈 때 storagePath 채우기
    def update_video_storage_path(self, uid: str, video_id: str, storage_path: str) -> str:
        """
        video.storagePath를 실제 업로드된 storage_path로 갱신.
        주의: status 판단은 job_service에서 한다.
        """
        self._ensure_exists(uid, video_id)

        storage_path = (storage_path or "").strip()
        if not storage_path:
            raise BadRequestError("storagePath는 비어있을 수 없습니다.")
        
        self.video_repo.update_video_storage_path(uid, video_id, storage_path)
        return storage_path


    # video 문서 수정: title, durationSec
    def update_video(self, uid: str, video_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_exists(uid, video_id)

        new_video: Dict[str, Any] = {}
        
        if "title" in patch:
            title = (patch.get("title") or "").strip()
            if not title:
                raise BadRequestError({"title은 필수 필드입니다."})
            new_video["title"] = title
        
        if "durationSec" in patch:
            duration = patch.get("durationSec")
            if duration is not None and (not isinstance(duration, int) or duration < 0):
                raise BadRequestError({"durationSec은 양수여야 합니다."})
            new_video["durationSec"] = duration

        if not new_video:
            raise BadRequestError("수정할 필드가 없습니다.")
            
        self.video_repo.update_video(uid, video_id, new_video)
        updated = self.video_repo.get_video(uid, video_id) or {}
        return {"videoId": video_id, **updated}


    def _ensure_exists(self, uid: str, video_id: str) -> None:
        if not self.video_repo.exists_video(uid, video_id):
            raise NotFoundError("Video not found")
