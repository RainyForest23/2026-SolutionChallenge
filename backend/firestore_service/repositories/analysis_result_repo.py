from google.cloud import firestore
from typing import Any, Dict, List, Optional
from .repo_paths import analysis_results_collection, analysis_result_doc
from ..storage_paths import result_object_path


class AnalysisResultRepository:
    """
    videoId 당 analysis_result는 여러 개 저장 가능 (히스토리)
    Path: users/{uid}/videos/{videoId}/analysis_results/{resultId}
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

    def _doc_ref(self, uid: str, video_id: str, result_id: str) -> firestore.DocumentReference:
        return self.db.document(analysis_result_doc(uid, video_id, result_id))

    def _col_ref(self, uid: str, video_id: str) -> firestore.CollectionReference:
        return self.db.collection(analysis_results_collection(uid, video_id))

    def _get_dict(self, ref: firestore.DocumentReference) -> Optional[Dict[str, Any]]:
        snap = ref.get()
        return snap.to_dict() if snap.exists else None
    

    # --------- public methods ---------

    # users/{uid}/videos/{videoId}/analysis_results/{resultId} 문서 생성
    def create_result(self, uid: str, video_id: str, subtitle_source: str) -> str:
        ref = self._col_ref(uid, video_id)
        new_doc = ref.document()

        result_id = new_doc.id
        result_path = result_object_path(uid, video_id, result_id)

        payload: Dict[str, Any] = {
            "resultPath": result_path,
            "subtitleSource": subtitle_source,
            "createdAt": self._now_ts(),
            "updatedAt": self._now_ts(),
        }  

        new_doc.set(payload)
        # result_id 반환  
        return result_id 
    

    # users/{uid}/videos/{videoId}/analysis_results/{resultId} 문서 조회
    def get_result(self, uid: str, video_id: str, result_id: str) -> Optional[Dict[str, Any]]:
        ref = self._doc_ref(uid, video_id, result_id)
        return self._get_dict(ref)
    
    
    # 실제 결과 json 파일 저장 경로 조회 (storage)
    def get_result_path(self, uid: str, video_id: str, result_id: str) -> Optional[str]:
        doc=self.get_result(uid, video_id, result_id)
        return doc.get("resultPath") if doc else None
    
    
    # users/{uid}/videos/{videoId}/analysis_results/{resultId} 문서 수정
    def update_result(self, uid: str, video_id: str, result_id: str, subtitle_source: str) -> None:
        ref = self._doc_ref(uid, video_id, result_id)

        ref.update({
            "subtitleSource": subtitle_source,
            "updatedAt": self._now_ts(),
        })


    # users/{uid}/videos/{videoId}/analysis_results/{resultId} 문서 삭제
    def delete_result(self, uid:str, video_id: str, result_id: str) -> None:
        ref=self._doc_ref(uid, video_id, result_id)
        ref.delete()

    
    # users/{uid}/videos/{videoId}/analysis_results/{resultId} 문서 존재 여부 확인
    def exists_result(self, uid: str, video_id: str, result_id: str) -> bool:
        ref = self._doc_ref(uid, video_id, result_id)
        return ref.get().exists


    # users/{uid}/videos/{videoId}/analysis_results 컬렉션에서 데이터 리스트 가져옴
    def list_results(self, uid: str, video_id: str, limit: int=50) -> List[Dict[str, Any]]:
        """
        users/{uid}/videos/{video_id}/analysis_results 목록 최신순(createdAt desc) 조회
        페이징 없음. limit만 걸어둠.
        """    
        q = (
            self._col_ref(uid, video_id)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )

        items = [self._with_id("resultId", d.id, d.to_dict()) for d in q.stream()]
        return items