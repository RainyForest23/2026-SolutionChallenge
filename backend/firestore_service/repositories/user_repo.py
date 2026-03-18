from google.cloud import firestore
from typing import Any, Dict, Optional
from .repo_paths import user_doc, users_collection
from ..firestore_client import get_firestore_client


class UserRepository:
    """
    Path: users/{uid}
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

    def _doc_ref(self, uid: str) -> firestore.DocumentReference:
        return self._db().document(user_doc(uid))

    def _col_ref(self) -> firestore.CollectionReference:
        return self._db().collection(users_collection())

    def _get_dict(self, ref: firestore.DocumentReference) -> Optional[Dict[str, Any]]:
        snap = ref.get()
        return snap.to_dict() if snap.exists else None

    # --------- public methods ---------

    # users/{uid} 문서 생성 (uid 고정-firebase auth 서버 발급)
    def create_user(self, uid: str, data: Dict[str, Any]) -> None:
        ref = self._doc_ref(uid)

        payload = dict(data)
        payload["uid"] = uid
        payload["createdAt"] = self._now_ts()
        payload["updatedAt"] = self._now_ts()
        payload["lastLoginAt"] = self._now_ts()

        ref.set(payload)


    # users/{uid} 문서 조회
    def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        ref = self._doc_ref(uid)
        return self._get_dict(ref)


    # users/{uid} 문서 수정
    def update_user(self, uid: str, patch: Dict[str, Any]) -> None:
        ref = self._doc_ref(uid)

        patch = dict(patch)
        patch["updatedAt"] = self._now_ts()

        ref.update(patch)


    # 마지막 로그인 시간 갱신 (updatedAt도 같이 갱신-문서 변경이므로)
    def update_last_login(self, uid: str) -> None:
        ref = self._doc_ref(uid)
        ref.update({
            "lastLoginAt": self._now_ts(),
            "updatedAt": self._now_ts(),
        })


    # users/{uid} 삭제 (필요 시)
    def delete_user(self, uid: str) -> None:
        ref = self._doc_ref(uid)
        ref.delete()


    # users/{uid} 존재 여부
    def exists_user(self, uid: str) -> bool:
        ref = self._doc_ref(uid)
        return ref.get().exists
