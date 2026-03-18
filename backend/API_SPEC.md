# SoundSight API 명세서

## 개요

- **Base URL**: `http://127.0.0.1:8080`
- **Protocol**: HTTP/REST
- **Response Format**: JSON
- **Authentication**: Firebase ID Token (Bearer, 모든 엔드포인트 필수)
---

## 🔐 Authentication

모든 API는 Firebase ID Token 인증이 필요합니다.

Authorization: Bearer <FIREBASE_ID_TOKEN>

- 로그인 후 발급된 Firebase ID Token을 사용합니다.
- 백엔드에서는 인증 성공 시 request.user에 Firebase uid를 저장합니다.
- request.auth에는 decode된 Firebase 토큰 payload가 들어갑니다.
- 사용자는 본인 소유의 리소스만 조회할 수 있습니다.

## 아키텍처

작업은 다음 순서로 진행됩니다:

1. `POST /api/analyze` → video 문서 생성 + job 문서 생성 + 백그라운드 큐 등록
2. `GET /api/status` → job 상태 폴링
3. `GET /api/result` → 완료된 분석 결과 조회

### 상태 전이 다이어그램

```
┌─────────┐
│ created │
└────┬────┘
     │ (Celery 작업 생성)
     ▼
┌──────────┐
│ queued   │ ← POST /api/analyze 응답
└────┬─────┘
     │
     ▼
┌──────────────┐
│ downloading  │ ← yt-dlp 다운로드 중
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ uploading    │ ← Firebase Storage 업로드 중
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ processing   │ ← AI 파이프라인 실행 중
└────┬─────────┘
     │
     ├─→  ┌──────┐
     │    │ done │  ← 성공
     │    └──────┘
     │
     └─→  ┌────────┐
          │ failed │  ← 오류 발생
          └────────┘
```

---

## 엔드포인트

### 1️⃣ POST `/api/analyze`

#### 설명
새로운 감정 분석 작업을 시작합니다. 즉시 응답을 반환하고 백그라운드에서 AI 파이프라인을 처리합니다.

#### 요청

**Method**: `POST`  
**Content-Type**: `application/json`

**Request Body**:
```json
{
  "title": "Sample Video",
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "upload_id": "uploads/video123",
  "callback_url": "https://example.com/webhook"
}
```

**필드 설명**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | string | 선택 | 영상 제목. 없으면 백엔드에서 기본값(예: `"Untitled Video"`)을 사용할 수 있음 |
| `youtube_url` | URL | 조건부* | YouTube 비디오 URL |
| `upload_id` | string | 조건부* | 사전 업로드된 파일의 식별자 |
| `callback_url` | URL | 선택 | 작업 완료 시 POST될 웹훅 URL |

*조건: `youtube_url` 또는 `upload_id` 중 **최소 하나는 필수**

> 현재 백엔드 구현 기준으로는 `youtube_url` 기반 분석 플로우가 우선 지원됩니다.  
> `upload_id` 기반 플로우는 추후 구현 예정이며 현재는 `501 Not Implemented`를 반환할 수 있습니다.

#### 응답

**Status Code**: `202 Accepted`

**Response Headers**:
```
Location: /api/status?job_id={job_id}
```

**Response Body**:
```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "video_id": "video123abc",
  "status": "queued"
}
```

#### 예시

```bash
curl -X POST http://127.0.0.1:8080/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "title": "Sample Video",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "callback_url": "https://example.com/webhook"
  }'
```

#### 에러 응답

**400 Bad Request** — 필수 필드 누락:
```json
{
  "non_field_errors": ["Provide either 'youtube_url' or 'upload_id'."]
}
```

**400 Bad Request** — 잘못된 URL:
```json
{
  "youtube_url": ["Enter a valid URL."]
}
```

**500 Internal Server Error** — 작업 대기열 추가 실패:
```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "video_id": "video123abc",
  "status": "failed"
}
```

**501 Not Implemented** — `upload_id` 기반 플로우는 아직 구현되지 않음:
```json
{
  "detail": "upload_id flow is not implemented yet in current service layer."
}
```

---

### 2️⃣ GET `/api/status`

#### 설명
진행 중인 작업의 현재 상태를 조회합니다. 프론트엔드에서 폴링하여 진행 상황을 확인할 수 있습니다.

#### 요청

**Method**: `GET`  
**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `job_id` | string | ✅ | `/api/analyze` 응답에서 받은 작업 ID |

#### 응답

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "video_id": "video123abc",
  "status": "processing",
  "error": null
}
```

**상태값 설명**:

| 상태 | 의미 | 다음 액션 |
|------|------|---------|
| `queued` | 대기열에 등록됨 | 폴링 계속 |
| `downloading` | 영상 다운로드 중 | 폴링 계속 |
| `uploading` | Storage 업로드 중 | 폴링 계속 |
| `processing` | AI 파이프라인 실행 중 | 폴링 계속 |
| `done` | 완료됨 | `/api/result` 호출 |
| `failed` | 오류 발생 | `error` 필드 확인 |

#### 예시

```bash
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 처리 중 응답

```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "video_id": "video123abc",
  "status": "processing",
  "error": null
}
```

#### 오류 응답

**404 Not Found** — 작업을 찾을 수 없음:
```json
{
  "detail": "Job not found"
}
```

**400 Bad Request** — job_id 누락:
```json
{
  "detail": "Missing required query param: job_id"
}
```

---

### 3️⃣ GET `/api/result`

#### 설명
완료된 작업의 감정 분석 결과를 조회합니다. 상태가 "done"일 때만 결과를 반환합니다.

#### 요청

**Method**: `GET`  
**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `job_id` | string | ✅ | `/api/analyze` 응답에서 받은 작업 ID |

#### 응답 (완료됨)

**Status Code**: `200 OK`

**Response Body**:
```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "video_id": "video123abc",
  "status": "done",
  "result": {
    "schemaVersion": "1.0.0",
    "videoUrl": "https://storage.googleapis.com/...",
    "base_moods": [
      {
        "label": "tension",
        "intensity": 0.75,
        "start": 0.0,
        "end": 5.0
      }
    ],
    "events": [
      {
        "type": "swell",
        "trigger_time": 3.2,
        "duration": 1.8,
        "strength": 0.60
      }
    ]
  }
}
```

#### 응답 (아직 처리 중)

**Status Code**: `202 Accepted`

**Response Body**:
```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "video_id": "video123abc",
  "status": "processing",
  "message": "Result not ready yet."
}
```

#### 예시

```bash
curl -X GET "http://127.0.0.1:8080/api/result?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 에러 응답

**404 Not Found**:
```json
{
  "detail": "Job not found",
}
```

**400 Bad Request**:
```json
{
  "detail": "Missing required query param: job_id"
}
```

---

## 사용 플로우 예시

### 시나리오: YouTube 영상 분석

**Step 1: 작업 시작**
```bash
curl -X POST http://127.0.0.1:8080/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

응답:
```json
{
  "job_id": "abc123def456",
  "video_id": "video123abc",
  "status": "queued"
}
```

**Step 2: 상태 폴링 (1초 간격)**
```bash
# 1번째 시도
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
# → { "job_id": "abc123def456", "video_id": "video123abc", "status": "queued", "error": null }


# 2번째 시도 (3초 뒤)
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
# → { "job_id": "abc123def456", "video_id": "video123abc", "status": "downloading", "error": null }



# 3번째 시도 (6초 뒤)
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
# → { "job_id": "abc123def456", "video_id": "video123abc", "status": "uploading", "error": null }


# 4번째 시도 (9초 뒤)
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
# → { "job_id": "abc123def456", "video_id": "video123abc", "status": "processing", "error": null }



# 5번째 시도 (15초 뒤)
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
# → { "job_id": "abc123def456", "video_id": "video123abc", "status": "done", "error": null }
```

**Step 3: 결과 조회**
```bash
curl -X GET "http://127.0.0.1:8080/api/result?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
```

응답:
```json
{
  "job_id": "abc123def456",
  "video_id": "video123abc",
  "status": "done",
  "result": {
    "schemaVersion": "1.0.0",
    "videoUrl": "https://storage.googleapis.com/...",
    "base_moods": [
      {
        "label": "tension",
        "intensity": 0.75,
        "start": 0.0,
        "end": 5.0
      },
      {
        "label": "sorrow",
        "intensity": 0.35,
        "start": 5.0,
        "end": 10.0
      }
    ],
    "events": [
      {
        "type": "swell",
        "trigger_time": 3.0,
        "duration": 1.5,
        "strength": 0.60
      },
      {
        "type": "stable",
        "trigger_time": 5.0,
        "duration": 5.0,
        "strength": 0.10
      }
    ]
  }
}

```

---

# 테스트 방법

## 1️⃣ 서버 실행

먼저 Django 서버를 실행합니다.

```bash
cd backend
python manage.py runserver
````

정상 실행 시 다음과 같은 메시지가 표시됩니다:

```
Starting development server at http://127.0.0.1:8080/
```

---

## 2️⃣ 브라우저(DRF Browsable API)로 테스트

Django REST Framework는 브라우저에서 직접 API 테스트가 가능합니다.

---

### POST `/api/analyze` 테스트

1. 브라우저에서 접속:

```
http://127.0.0.1:8080/api/analyze
```

2. 페이지 하단의 **Content 입력창**에 아래 JSON 입력:

```json
{
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

3. **POST 버튼 클릭**

4. 응답 예시:

```json
{
  "job_id": "abc123def456",
  "video_id": "video123abc",
  "status": "queued"
}
```

---

### GET `/api/status` 테스트

브라우저 주소창에 입력:
“브라우저 테스트 시, 상단의 Headers 또는 Authorization에 Bearer <TOKEN>을 포함해야 합니다.”

```
http://127.0.0.1:8080/api/status?job_id=abc123
```

응답 예시:

```json
{
  "job_id": "abc123def456",
  "video_id": "video123abc",
  "status": "queued",
  "error": null
}
```

---

### 🔹 GET `/api/result` 테스트

브라우저 주소창에 입력:

```
http://127.0.0.1:8080/api/result?job_id=abc123
```

처리 중일 경우:

```json
{
  "job_id": "abc123def456",
  "video_id": "video123abc",
  "status": "queued",
  "message": "Result not ready yet."
}
```

---

## 3️⃣ curl로 테스트

### 작업 시작

```bash
curl -X POST http://127.0.0.1:8080/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title": "Sample Video", "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### 상태 조회

```bash
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
```

### 결과 조회

```bash
curl -X GET "http://127.0.0.1:8080/api/result?job_id=abc123" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 4️⃣ VS Code REST Client 

1. VS Code에서 `REST Client` 설치
2. `backend/api_test.http` 파일 
3. 각 요청 위의 **Send Request** 버튼 클릭

```
---

## 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|--------|
| v1.0 | 2026-02-26 | 초기 API 명세 작성 |
| v2.0 | 2026-03-01 | Firebase 인증 추가 + 2-Track 시스템 초안 반영 |
| v3.0 | 2026-03-05 | service/repository 구조 반영 + video_id 추가 + 프론트 최종 결과 스키마 반영 |
---
