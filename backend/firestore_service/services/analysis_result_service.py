from typing import Any, Dict, List, Optional

class NotFoundError(Exception):
    pass

class BadRequestError(Exception):
    pass


class AnalysisResultService:
    def __init__(self, analysis_result_repo):
        self.result_repo = analysis_result_repo


    def create_result(self, uid: str, video_id: str, subtitle_source: str = "youtube") -> Dict[str, Any]:
        subtitle_source = (subtitle_source or "").strip() or "youtube"

        result_id = self.result_repo.create_result(uid, video_id, subtitle_source)
        result = self.result_repo.get_result(uid, video_id, result_id) or {}
        return {"resultId": result_id, **result}


    def get_result(self, uid: str, video_id: str, result_id: str) -> Dict[str, Any]:
        result = self.result_repo.get_result(uid, video_id, result_id)
        if result is None:
            raise NotFoundError("Analysis result not found")
        return {"resultId": result_id, **result}


    def get_result_path(self, uid: str, video_id: str, result_id: str) -> str:
        path = self.result_repo.get_result_path(uid, video_id, result_id)
        if path is None:
            raise NotFoundError("Analysis result path not found")
        return path


    def list_results(self, uid: str, video_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if limit <= 0 or limit > 200:
            raise BadRequestError("limit은 1~200 범위여야 합니다.")
        return self.result_repo.list_results(uid, video_id, limit=limit)


    def get_latest_result(self, uid: str, video_id: str) -> Optional[Dict[str, Any]]:
        items = self.result_repo.list_results(uid, video_id, limit=1)
        return items[0] if items else None


    def update_subtitle_source(self, uid: str, video_id: str, result_id: str, subtitle_source: str) -> Dict[str, Any]:
        self._ensure_exists(uid, video_id, result_id)

        subtitle_source = (subtitle_source or "").strip()
        if not subtitle_source:
            raise BadRequestError("subtitleSource은 필수 필드입니다.")

        self.result_repo.update_result(uid, video_id, result_id, subtitle_source)
        # 최신 상태 반환
        return self.get_result(uid, video_id, result_id)


    def delete_result(self, uid: str, video_id: str, result_id: str) -> None:
        self._ensure_exists(uid, video_id, result_id)
        self.result_repo.delete_result(uid, video_id, result_id)


    def _ensure_exists(self, uid: str, video_id: str, result_id: str) -> None:
        if not self.result_repo.exists_result(uid, video_id, result_id):
            raise NotFoundError("Analysis result not found")