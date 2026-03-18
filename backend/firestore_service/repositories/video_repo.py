from google.cloud import firestore
from typing import Any, Dict, List, Optional
from .repo_paths import video_doc, videos_collection



class VideoRepository:
    """
    Path: users/{uid}/videos/{videoId}
    """

    def __init__(self):
        self.db = firestore.Client()

    # --------- internal helpers ---------

    @staticmethod
    def _now_ts():
        return firestore.SERVER_TIMESTAMP

    @staticmethod
    def _with_id(field: str, doc_id: str, data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return {field: doc_id, **(data or {})}

    def _doc_ref(self, uid: str, video_id: str) -> firestore.DocumentReference:
        return self.db.document(video_doc(uid, video_id))

    def _col_ref(self, uid: str) -> firestore.CollectionReference:
        return self.db.collection(videos_collection(uid))

    def _get_dict(self, ref: firestore.DocumentReference) -> Optional[Dict[str, Any]]:
        snap = ref.get()
        return snap.to_dict() if snap.exists else None
    

    # --------- public methods ---------

    # users/{uid}/videos/{videoId} 문서 생성
    def create_video(self, uid: str, data: Dict[str, Any]) -> str:
        ref = self._col_ref(uid)
        new_doc = ref.document()

        payload = dict(data)
        payload["uid"] = uid
        payload.setdefault("sourceType", "youtube")  # 우선 고정
        payload.setdefault("currentStatus", "queued")  # default
        payload["createdAt"] = self._now_ts()
        payload["updatedAt"] = self._now_ts()

        new_doc.set(payload)
        # video_id 반환
        return new_doc.id
    
    
    # users/{uid}/videos/{videoId} 문서 조회
    def get_video(self, uid: str, video_id: str) -> Optional[Dict[str, Any]]:
        ref = self._doc_ref(uid, video_id)
        return self._get_dict(ref)
    

    # 실제 video 파일 저장 경로 조회 (storage)
    def get_video_storage_path(self, uid: str, video_id: str) -> Optional[str]:
        doc=self.get_video(uid, video_id)
        return doc.get("storagePath") if doc else None
    

    # storagePath 업데이트. storage에 비디오 업로드 완료 후 채움
    def update_video_storage_path(self, uid: str, video_id: str, storage_path: str) -> str:
        ref = self._doc_ref(uid, video_id)

        ref.update({
            "storagePath": storage_path,
            "updatedAt": self._now_ts(),
        })


    # users/{uid}/videos/{videoId} 문서 수정
    def update_video(self, uid: str, video_id: str, patch: Dict[str, Any]) -> None:
        ref = self._doc_ref(uid, video_id)

        patch = dict(patch)
        patch["updatedAt"] = self._now_ts()

        ref.update(patch)


    # 현재 job status 갱신. updatedAt 갱신 X
    def update_latest_status(self, uid: str, video_id: str, status: str) -> None:
        ref = self._doc_ref(uid, video_id)
        ref.update({"currentStatus": status})
        

    # users/{uid}/videos/{videoId} 문서 삭제
    def delete_video(self, uid: str, video_id: str) -> None:
        ref = self._doc_ref(uid, video_id)
        ref.delete()
        

    # users/{uid}/videos/{videoId} 문서 존재 여부 확인
    def exists_video(self, uid: str, video_id: str) -> bool:
        ref = self._doc_ref(uid, video_id)
        return ref.get().exists
    

    # users/{uid}/videos 컬렉션에서 데이터 리스트 가져옴
    def list_videos(self, uid: str, limit: int=50) -> List[Dict[str, Any]]:
        """
        users/{uid}/videos 목록 최신순(createdAt desc) 조회
        페이징 없음. limit만 걸어둠.
        """
        q = (
            self._col_ref(uid)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )

        items = [self._with_id("videoId", d.id, d.to_dict()) for d in q.stream()]
        return items
    

    # youtubeVideoId 로 video 검색
    def find_by_youtube_id(self, uid: str, youtube_video_id: str) -> Optional[Dict[str, Any]]:
        col = self._col_ref(uid)
        q = col.where("youtubeVideoId", "==", youtube_video_id).limit(1)

        docs = list(q.stream())
        if not docs: 
            return None
        d = docs[0]
        return self._with_id("videoId", d.id, d.to_dict())
    