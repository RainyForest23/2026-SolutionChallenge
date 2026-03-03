from google.cloud import firestore
from typing import Any, Dict, List, Optional
from .repo_paths import job_doc, jobs_collection

db = firestore.Client()

ACTIVE_STATUSES = {"queued", "downloading", "uploading", "processing"}

class JobRepository:
    """
    Path: users/{uid}/jobs/{jobId}
    """

    # --------- internal helpers ---------

    @staticmethod
    def _now_ts():
        return firestore.SERVER_TIMESTAMP

    @staticmethod
    def _with_id(field: str, doc_id: str, data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return {field: doc_id, **(data or {})}

    def _doc_ref(self, uid: str, job_id: str) -> firestore.DocumentReference:
        return db.document(job_doc(uid, job_id))

    def _col_ref(self, uid: str) -> firestore.CollectionReference:
        return db.collection(jobs_collection(uid))

    def _get_dict(self, ref: firestore.DocumentReference) -> Optional[Dict[str, Any]]:
        snap = ref.get()
        return snap.to_dict() if snap.exists else None
    

    # --------- public methods ---------

    # users/{uid}/jobs/{jobId} 문서 생성 (videoId 필수, jobId는 view에서 생성)
    def create_job(self, uid: str, job_id: str, data: Dict[str, Any]) -> None:
        new_doc = self._doc_ref(uid, job_id)

        payload = dict(data)
        payload["jobId"] = job_id  # 스키마 필수
        payload["createdAt"] = self._now_ts()
        payload["updatedAt"] = self._now_ts()

        new_doc.set(payload)


    # users/{uid}/jobs/{jobId} 문서 조회
    def get_job(self, uid: str, job_id: str) -> Optional[Dict[str, Any]]:
        ref = self._doc_ref(uid, job_id)
        return self._get_dict(ref)


    # users/{uid}/jobs/{jobId} 문서 수정
    def update_job(self, uid: str, job_id: str, patch: Dict[str, Any]) -> None:
        ref = self._doc_ref(uid, job_id)

        data = dict(patch)
        data["updatedAt"] = self._now_ts()

        ref.update(data)


    # users/{uid}/jobs/{jobId} 문서 삭제
    def delete_job(self, uid: str, job_id: str) -> None:
        ref = self._doc_ref(uid, job_id)
        ref.delete()


    # users/{uid}/jobs/{jobId} 문서 존재 여부 확인
    def exists_job(self, uid: str, job_id: str) -> bool:
        ref = self._doc_ref(uid, job_id)
        return ref.get().exists  


    # users/{uid}/jobs 컬렉션에서 데이터 리스트 가져옴
    def list_jobs(self, uid: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        users/{uid}/jobs 목록 최신순(createdAt desc) 조회
        페이징 없음. limit만 걸어둠.
        """
        q = (
            self._col_ref(uid)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )

        items = [self._with_id("jobId", d.id, d.to_dict()) for d in q.stream()]
        return items
    

    # 특정 video의 가장 최근 job 검색
    def get_latest_job_by_video(self, uid: str, video_id: str) -> Optional[Dict[str, Any]]:
        q = (
            self._col_ref(uid)
            .where("videoId", "==", video_id)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(1)
        )

        docs = list(q.stream())
        if not docs:
            return None
        d = docs[0]
        return self._with_id("jobId", d.id, d.to_dict())
    

    # 특정 video의 active job 검색 (추후 확장용)
    def get_active_job_by_video(self, uid: str, video_id: str) -> Optional[Dict[str, Any]]:
        q = (
            self._col_ref(uid)
            .where("videoId", "==", video_id)
            .where("status", "in", list(ACTIVE_STATUSES))
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(1)
        )

        docs = list(q.stream())
        if not docs:
            return None
        d = docs[0]
        return self._with_id("jobId", d.id, d.to_dict())