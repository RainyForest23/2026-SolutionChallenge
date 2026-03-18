from google.cloud import firestore
from typing import Any, Dict, List, Optional
from .repo_paths import feedback_doc, feedbacks_collection
from ..firestore_client import get_firestore_client

class FeedbackRepository:
    """
    videoId 당 feedback은 여러 개 저장 가능
    Path: users/{uid}/videos/{videoId}/feedbacks/{feedbackId}
    """

    def __init__(self):
        self.db = firestore.Client()

    # --------- internal helpers ---------

    @staticmethod
    def _now_ts():
        return firestore.SERVER_TIMESTAMP

    @staticmethod
    def _db():
        return get_firestore_client()

    @staticmethod
    def _with_id(field: str, doc_id: str, data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return {field: doc_id, **(data or {})}

    def _doc_ref(self, uid: str, video_id: str, feedback_id: str) -> firestore.DocumentReference:
        return self._db().document(feedback_doc(uid, video_id, feedback_id))

    def _col_ref(self, uid: str, video_id: str) -> firestore.CollectionReference:
        return self._db().collection(feedbacks_collection(uid, video_id))

    def _get_dict(self, ref: firestore.DocumentReference) -> Optional[Dict[str, Any]]:
        snap = ref.get()
        return snap.to_dict() if snap.exists else None
    

    # --------- public methods ---------
        
    # users/{uid}/videos/{videoId}/feedbacks/{feedbackId} 문서 생성
    def create_feedback(self, uid: str, video_id: str, data: Dict[str, Any]) -> str:
        ref = self._col_ref(uid,video_id)
        new_doc = ref.document() 

        payload = dict(data)  # rating/comment 들어올 수 있음
        payload["createdAt"] = self._now_ts()
        payload["updatedAt"] = self._now_ts()

        new_doc.set(payload)
        # feedback_id 반환
        return new_doc.id 


    # users/{uid}/videos/{videoId}/feedbacks/{feedbackId} 문서 조회
    def get_feedback(self, uid: str, video_id: str, feedback_id: str) -> Dict[str, Any]:
        ref = self._doc_ref(uid, video_id, feedback_id)
        return self._get_dict(ref)


    # users/{uid}/videos/{videoId}/feedbacks/{feedbackId} 문서 수정
    def update_feedback(self, uid: str, video_id: str, feedback_id: str, patch: Dict[str, Any]) -> None:
        ref = self._doc_ref(uid, video_id, feedback_id)

        data = dict(patch)
        data["updatedAt"] = self._now_ts()

        ref.update(data)


    # users/{uid}/videos/{videoId}/feedbacks/{feedbackId} 문서 삭제
    def delete_feedback(self, uid: str, video_id: str, feedback_id: str) -> None:
        ref = self._doc_ref(uid, video_id, feedback_id)
        ref.delete()


    # users/{uid}/videos/{videoId}/feedbacks/{feedbackId} 문서 존재 여부 확인
    def exists_feedback(self, uid: str, video_id: str, feedback_id: str) -> bool:
        ref = self._doc_ref(uid, video_id, feedback_id)
        return ref.get().exists


    # users/{uid}/videos/{videoId}/feedbacks 컬렉션에서 데이터 리스트 가져옴
    def list_feedbacks(self, uid: str, video_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        users/{uid}/videos/{video_id}/feedbacks 목록 최신순(createdAt desc) 조회
        페이징 없음. limit만 걸어둠.
        """
        q = (
            self._col_ref(uid, video_id)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )

        items = [self._with_id("feedbackId", d.id, d.to_dict()) for d in q.stream()]
        return items
