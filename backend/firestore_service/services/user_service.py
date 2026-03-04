from typing import Any, Dict, Optional


class NotFoundError(Exception):
    pass

class BadRequestError(Exception):
    pass

class ConflictError(Exception):
    pass


class UserService:
    def __init__(self, user_repo):
        self.user_repo = user_repo


    # decoded token으로 users/{uid} upsert
    def upsert_user_from_decoded(self, decoded: Dict[str, Any]) -> Dict[str, Any]:
        """
        decoded: firebase_admin.auth.verify_id_token() 결과
        - 최초 로그인/첫 API 호출 시 user 문서 없으면 생성
        - 있으면 lastLoginAt 갱신 + 비어있는 필드만 채움(덮어쓰기 최소화)
        - decoded 구조
          - uid: .. / email: .. / picture: .. / firebase: {sign_in_provider: ..}
        """
        uid = decoded.get("uid")
        if not uid:
            raise BadRequestError("Token has no uid")

        email = decoded.get("email")
        provider = decoded.get("firebase", {}).get("sign_in_provider")
        display_name = decoded.get("name")  # default: Google Name
        photo_url = decoded.get("picture")

        existing = self.user_repo.get_user(uid)

        if existing is None: # 회원가입
            
            if not email:
                raise BadRequestError("email은 필수 필드입니다.")

            payload: Dict[str, Any] = {
                "uid": uid,
                "email": email,
            }

            if provider:
                payload["provider"] = provider
            else: # 필수 도메인 필드 아니기에 강제 필수 X
                payload["provider"] = "unknown"

            if display_name:
                payload["displayName"] = display_name
            if photo_url:
                payload["photoURL"] = photo_url

            self.user_repo.create_user(uid, payload)

        else: # 로그인
            patch: Dict[str, Any] = {}

            # email/displayName/photoURL은 "기존 값이 없을 때만" 채우기 
            if email and not existing.get("email"):
                patch["email"] = email
            if display_name and not existing.get("displayName"):
                patch["displayName"] = display_name
            if photo_url and not existing.get("photoURL"):
                patch["photoURL"] = photo_url

            # 변경점이 있으면 업데이트
            if patch:
                self.user_repo.update_user(uid, patch)

            # lastLoginAt은 항상 갱신
            self.user_repo.update_last_login(uid)                

        user = self.user_repo.get_user(uid) or {}
        return {"uid": uid, **user}


    # user 조회
    def get_user(self, uid: str) -> Dict[str, Any]:
        user = self.user_repo.get_user(uid)
        if user is None:
            raise NotFoundError("User not found")
        return {"uid": uid, **user}


    # 닉네임(=displayName) 수정 
    def update_display_name(self, uid: str, display_name: str) -> Dict[str, Any]:
        self._ensure_exists(uid)

        name = (display_name or "").strip()
        if not name:
            raise BadRequestError("displayName은 비어있을 수 없습니다.")

        self.user_repo.update_user(uid, {"displayName": name})
        updated = self.user_repo.get_user(uid) or {}
        return {"uid": uid, **updated}


    def _ensure_exists(self, uid: str) -> None:
        if not self.user_repo.exists_user(uid):
            raise NotFoundError("User not found")