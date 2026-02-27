# SoundSight API 명세서

## 개요

- **Base URL**: `http://127.0.0.1:8080`
- **Protocol**: HTTP/REST
- **Response Format**: JSON
- **Authentication**: 현재 없음 (Phase 1)

---

## 아키텍처

작업은 3단계로 진행됩니다:

```
1. POST /api/analyze     → 작업 생성 및 백그라운드 큐 등록
   ↓
2. GET /api/status       → 진행 상황 폴링
   ↓
3. GET /api/result       → 완료 후 결과 조회
```

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
│ processing   │ ← AI 파이프라인 실행 중
└────┬─────────┘
     │
     ├─→ ┌──────┐
     │    │ done │  ← 성공
     │    └──────┘
     │
     └─→ ┌────────┐
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
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "upload_id": "uploads/video123",
  "callback_url": "https://example.com/webhook"
}
```

**필드 설명**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `youtube_url` | URL | 조건부* | YouTube 비디오 URL |
| `upload_id` | string | 조건부* | 사전 업로드된 파일의 식별자 |
| `callback_url` | URL | 선택 | 작업 완료 시 POST될 웹훅 URL |

*조건: `youtube_url` 또는 `upload_id` 중 **최소 하나는 필수**

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
  "status": "queued"
}
```

#### 예시

```bash
curl -X POST http://127.0.0.1:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
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
  "status": "failed"
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
  "status": "processing",
  "error": null
}
```

**상태값 설명**:

| 상태 | 의미 | 다음 액션 |
|------|------|---------|
| `queued` | 대기열에 등록됨 | 폴링 계속 |
| `processing` | AI 파이프라인 실행 중 | 폴링 계속 |
| `done` | 완료됨 | `/api/result` 호출 |
| `failed` | 오류 발생 | `error` 필드 확인 |

#### 예시

```bash
curl -X GET "http://127.0.0.1:8080/api/status?job_id=a1b2c3d4e5f6g7h8"
```

#### 처리 중 응답

```json
{
  "job_id": "a1b2c3d4e5f6g7h8",
  "status": "processing",
  "error": null
}
```

#### 오류 응답

**404 Not Found** — 작업을 찾을 수 없음:
```json
{
  "error": "Job not found",
  "job_id": "invalid_id"
}
```

**400 Bad Request** — job_id 누락:
```json
{
  "error": "Missing required query param: job_id"
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
  "status": "done",
  "result": {
    "emotion_timeline": [
      {
        "t_start": 0.0,
        "t_end": 5.0,
        "emotion": "neutral",
        "intensity": 0.3
      },
      {
        "t_start": 5.0,
        "t_end": 10.0,
        "emotion": "happy",
        "intensity": 0.7
      },
      {
        "t_start": 10.0,
        "t_end": 15.0,
        "emotion": "sad",
        "intensity": 0.5
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
  "status": "processing",
  "message": "Result not ready yet."
}
```

#### 예시

```bash
curl -X GET "http://127.0.0.1:8080/api/result?job_id=a1b2c3d4e5f6g7h8"
```

#### 에러 응답

**404 Not Found**:
```json
{
  "error": "Job not found",
  "job_id": "invalid_id"
}
```

**400 Bad Request**:
```json
{
  "error": "Missing required query param: job_id"
}
```

---

## 사용 플로우 예시

### 시나리오: YouTube 영상 분석

**Step 1: 작업 시작**
```bash
curl -X POST http://127.0.0.1:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

응답:
```json
{
  "job_id": "abc123def456",
  "status": "queued"
}
```

**Step 2: 상태 폴링 (1초 간격)**
```bash
# 1번째 시도
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123def456"
# → { "status": "queued" }

# 2번째 시도 (5초 뒤)
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123def456"
# → { "status": "processing" }

# 3번째 시도 (10초 뒤)
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123def456"
# → { "status": "done" }
```

**Step 3: 결과 조회**
```bash
curl -X GET "http://127.0.0.1:8080/api/result?job_id=abc123def456"
```

응답:
```json
{
  "job_id": "abc123def456",
  "status": "done",
  "result": {
    "emotion_timeline": [
      { "t_start": 0, "t_end": 5, "emotion": "neutral", "intensity": 0.3 },
      { "t_start": 5, "t_end": 10, "emotion": "happy", "intensity": 0.7 }
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
  "status": "queued"
}
```

---

### GET `/api/status` 테스트

브라우저 주소창에 입력:

```
http://127.0.0.1:8080/api/status?job_id=abc123def456
```

응답 예시:

```json
{
  "job_id": "abc123def456",
  "status": "queued",
  "error": null
}
```

---

### 🔹 GET `/api/result` 테스트

브라우저 주소창에 입력:

```
http://127.0.0.1:8080/api/result?job_id=abc123def456
```

처리 중일 경우:

```json
{
  "job_id": "abc123def456",
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
  -d '{"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### 상태 조회

```bash
curl -X GET "http://127.0.0.1:8080/api/status?job_id=abc123def456"
```

### 결과 조회

```bash
curl -X GET "http://127.0.0.1:8080/api/result?job_id=abc123def456"
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

---
