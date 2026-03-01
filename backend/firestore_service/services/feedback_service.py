from typing import Any, Dict, List, Optional

class NotFoundError(Exception):
    pass

class BadRequestError(Exception):
    pass

class FeedbackService:
    """
    Feedback 규칙:
    - rating: 필수 (1~5)
    - comment: 선택 (공백만은 불허)
    """

    def __init__(self, feedback_repo):
        self.feedback_repo = feedback_repo


    def create_feedback(self, uid: str, video_id: str, rating: int, comment: Optional[str] = None) -> Dict[str, Any]:
        if rating < 1 or rating > 5:
            raise BadRequestError("rating은 1~5 범위여야 합니다.")
        
        feedback_payload: Dict[str, Any] = {
            "uid": uid,
            "videoId": video_id,
            "rating": rating,
        }

        if comment is not None:
            if not isinstance(comment, str):
                raise BadRequestError("comment는 문자열이어야 합니다.")
            if comment.strip() == "":
                raise BadRequestError("comment는 공백이 허용되지 않습니다.")
            feedback_payload["comment"] = comment.strip()
        
        feedback_id = self.feedback_repo.create_feedback(uid, video_id, feedback_payload)
        feedback = self.feedback_repo.get_feedback(uid, video_id, feedback_id) or {}
        return {"feedbackId": feedback_id, **feedback}


    def get_feedback(self, uid: str, video_id: str, feedback_id: str) -> Dict[str, Any]:
        feedback = self.feedback_repo.get_feedback(uid, video_id, feedback_id)
        if feedback is None:
            raise NotFoundError("feedback not found")
        return {"feedbackId": feedback_id, **feedback}


    def list_feedbacks(self, uid: str, video_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if limit <= 0 or limit > 200:
            raise BadRequestError("limit은 1~200 범위여야 합니다.")
        return self.feedback_repo.list_feedbacks(uid, video_id, limit=limit)


    def update_feedback(self, uid: str, video_id: str, feedback_id: str, patch: Dict[str, Any]) -> None:
        if not patch:
            raise BadRequestError("수정할 필드가 없습니다.")
        self._ensure_exists(uid, video_id, feedback_id)

        new_feedback: Dict[str, Any] = {}

        if "rating" in patch:
            rating = patch.get("rating")
            if rating is None:
                raise BadRequestError("rating은 null로 설정할 수 없습니다.")
            if not isinstance(rating, int):
                raise BadRequestError("rating은 숫자여야 합니다.")
            if rating < 1 or rating > 5:
                raise BadRequestError("rating은 1~5 범위여야 합니다.")
            new_feedback["rating"] = rating
            
        if "comment" in patch:
            comment = patch.get("comment")
            if comment is None:
                new_feedback["comment"] = None
            else:
                if not isinstance(comment, str):
                    raise BadRequestError("comment는 문자열이어야 합니다.")
                if comment.strip() == "":
                    raise BadRequestError("comment는 공백이 허용되지 않습니다.")
                new_feedback["comment"] = comment.strip()

        if not new_feedback:
            raise NotFoundError("수정 가능한 필드가 없습니다.")

        self.feedback_repo.update_feedback(uid, video_id, feedback_id, new_feedback)


    def delete_feedback(self, uid: str, video_id: str, feedback_id: str) -> None:
        self._ensure_exists(uid, video_id, feedback_id)
        self.feedback_repo.delete_feedback(uid, video_id, feedback_id)


    def _ensure_exists(self, uid: str, video_id: str, feedback_id: str) -> None:
        if not self.feedback_repo.exists_result(uid, video_id, feedback_id):
            raise NotFoundError("Feedback not found")