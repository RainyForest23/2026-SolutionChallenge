# api/authentication.py
from typing import Optional, Tuple, Any
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.http import HttpRequest

# 기존에 만든 helper 재사용
from firestore_service.auth_helper import get_bearer_token, verify_id_token


class FirebaseAuthentication(BaseAuthentication):
    """
    DRF Authentication class for Firebase ID Token (Bearer).
    - 성공 시: (user, auth) 반환
        - user: uid (str)
        - auth: decoded token (dict)
    - Authorization 헤더가 없으면 None 반환 (AllowAny 엔드포인트 지원)
    """

    def authenticate(self, request: HttpRequest) -> Optional[Tuple[Any, Any]]:
        # 헤더가 없으면 "인증 시도 자체를 안 함"으로 처리
        header = request.META.get("HTTP_AUTHORIZATION")
        if not header:
            return None

        # Bearer 토큰 파싱 (helper 사용)
        try:
            id_token = get_bearer_token(request)
        except Exception as e:
            raise AuthenticationFailed(str(e))

        # Firebase 토큰 검증 (helper 사용)
        decoded = verify_id_token(id_token)

        uid = decoded.get("uid")
        if not uid:
            raise AuthenticationFailed("Token has no uid")

        # DRF가 request.user / request.auth를 채움
        return (uid, decoded)
