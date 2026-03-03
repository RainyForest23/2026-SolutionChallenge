from typing import Dict, Any, Tuple, Optional
from django.http import HttpRequest
from rest_framework.exceptions import NotAuthenticated, AuthenticationFailed
from firebase_admin import auth as firebase_auth
from .firebase_app import get_firebase_app

# 요청 객체에서 Authorization 헤더 문자열 꺼내옴
def _get_auth_header(request: HttpRequest) -> Optional[str]:
    return request.META.get("HTTP_AUTHORIZATION")

# Authorization 헤더 문자열에서 token 추출
def get_bearer_token(request: HttpRequest) -> str:
    header = _get_auth_header(request)
    if not header:
        raise NotAuthenticated("Missing Authorization header")
    parts = header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthenticationFailed("Invalid Authorization header (expected: Bearer <token>)")
    return parts[1]

# id token 검증
def verify_id_token(id_token: str) -> Dict[str, Any]:
    get_firebase_app()
    try:
        return firebase_auth.verify_id_token(id_token, check_revoked=False)
    except firebase_auth.ExpiredIdTokenError:
        raise AuthenticationFailed("Token expired")
    except firebase_auth.RevokedIdTokenError:
        raise AuthenticationFailed("Token revoked")
    except firebase_auth.InvalidIdTokenError:
        raise AuthenticationFailed("Invalid token")
    except Exception:
        raise AuthenticationFailed("Token verification failed")

# 검증된 token 바탕으로 uid, decoded(사용자 정보) 반환
def authenticate_request(request: HttpRequest) -> Tuple[str, Dict[str, Any]]:
    token = get_bearer_token(request)
    decoded = verify_id_token(token)
    uid = decoded.get("uid")
    if not uid:
        raise AuthenticationFailed("Token has no uid")
    return uid, decoded

def authenticate_uid(request: HttpRequest):
    uid, _=authenticate_request(request)
    return uid