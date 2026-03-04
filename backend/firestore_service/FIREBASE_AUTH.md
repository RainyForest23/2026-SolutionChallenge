# Firebase Authentication 연동 가이드

## 개요

SoundSight 백엔드는 Firebase Authentication의 **ID Token 기반 인증**을 사용합니다.

클라이언트(RN 앱)는 로그인 후 발급받은 ID Token을
Authorization: Bearer <token> 형태로 요청 헤더에 포함해야 합니다.

---

## 인증 흐름

```
RN 로그인
  ↓
Firebase ID Token 발급
  ↓
HTTP 요청
Authorization: Bearer <ID_TOKEN>
  ↓
DRF authentication 실행
FirebaseAuthentication.authenticate()
  ↓
DRF permission 검사 (자동)
  ↓
Firebase (verify_id_token)
request.user = uid
request.auth = decoded
  ↓
view (uid = request.user)
```

## 로컬 개발 환경 설정

### 1️⃣ Firebase 서비스 계정 키 발급

1. Firebase 콘솔 접속
2. soundsight-dev 프로젝트 선택
3. 좌측 상단 톱니바퀴 → 서비스 계정 클릭
4. Firebase Admin SDK → Python → 비공개 키 생성
5. backend/secret/ 폴더에 json 키 보관

### ⚠️ 서비스 계정 키는 Git에 절대 커밋하지 않습니다.

## 모듈 구조

```
api/
 └── authentication.py   # DRF 자동 실행 
firestore_service/
 ├── firebase_app.py   # Firebase Admin SDK 초기화
 └── auth_helper.py    # ID Token 검증 helper
```

## 백엔드 내 사용 방법

### 1️⃣ 요청 헤더
```
Authorization: Bearer <ID_TOKEN>
```

### 2️⃣ View 내부에서 인증 사용 방법
DRF FirebaseAuthentication이 요청 처리 전에 자동으로 실행됩니다.
인증이 성공하면 다음 값이 설정됩니다.
- request.user → Firebase uid
- request.auth → decoded Firebase ID Token

View에서는 request.user를 사용하면 됩니다.

```python
from rest_framework.permissions import IsAuthenticated

@api_view(["POST"])
def some_view(request):
    uid = request.user
    decoded_token = request.auth   # 필요할 때만 사용
    ...
```

공개 API가 필요할 경우는 예외 처리 합니다.

```python
from rest_framework.permissions import AllowAny

@api_view(["GET"])
@permission_classes([AllowAny])
def open_view(request):
    ...
```

## 테스트 엔드포인트

### GET /api/me

인증 연동 확인용 API

**Request**

```
GET /api/me
Authorization: Bearer <ID_TOKEN>
```

**Response**

```
{
  "uid": "CWYS3TAeUycTUnPDLVTWIcVyqlK2",
  "email": "aaa@gmail.com"
}
```

## 현재 상태

- Firebase Admin SDK 연동 완료
- ID Token 검증 성공
- /api/me 테스트 통과
- DRF 인증 자동 실행 설정 (settings.py)