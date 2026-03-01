# Firestore Service (CRUD Layer) (v1.0)

## 0. 개요

이 디렉토리는 SoundSight 백엔드에서 Firestore에 접근하는 **CRUD 계층**을 제공합니다.

- Repository: Firestore 문서/컬렉션에 대한 직접 CRUD (path, timestamp 처리 포함)
- Service: 비즈니스 규칙/검증/에러 처리 규약을 포함한 도메인 로직

View 계층은 api 디렉토리에서 관리합니다.

- View: Service에서 발생한 도메인 에러를 DRF 예외/응답으로 변환

## 1. Directory Structure

```
firestore_service/
  repositories/
    paths.py
    video_repo.py
    job_repo.py
    analysis_result_repo.py
    feedback_repo.py
  services/
    video_service.py
    job_service.py
    analysis_result_service.py
    feedback_service.py
```

## 2. Firestore Paths & Schema

Firestore 경로 상수 및 builder는 `repositories/paths.py`에서 관리합니다.
```
users/{uid}/videos/{videoId}
users/{uid}/videos/{videoId}/analysis_results/{resultId}
users/{uid}/videos/{videoId}/feedbacks/{feedbackId}
users/{uid}/jobs/{jobId}
```
스키마 상세는 `docs/FIRESTORE_SCHEMA.md` 참고.

## 3. Repositories

Repository는 Firestore Client를 통해 문서/컬렉션 CRUD를 수행합니다.

---

### 3.0 `paths.py`

- 컬렉션 이름 상수 정의 (`USERS`, `VIDEOS`, `JOBS`, `ANALYSIS_RESULTS`, `FEEDBACK`)
- Firestore document/collection 경로 builder 제공
- Storage 경로 builder 제공
  - `videos/{uid}/{videoId}.mp4`
  - `results/{uid}/{videoId}/{resultId}.json`  

---

### 3.1 `VideoRepository` (`video_repo.py`)

**Path**: `users/{uid}/videos/{videoId}`

**주요 기능**

- `create_video(uid, data) -> videoId`: video 문서 생성 (videoId 자동 발급)
- `get_video / delete_video / exists_video`
- `list_videos(uid, video_id, limit)`: 최신순 목록
- `update_video_storage_path(uid, video_id) -> storagePath`: 업로드 완료 후 storagePath 채움
- `update_video(uid, video_id, patch)`: 부분 수정 + updatedAt 갱신
- `update_latest_job(uid, video_id, status)`: video.currentStatus 갱신 (updatedAt 미갱신)
- `find_by_youtube_id(uid, youtube_video_id)`: youtubeVideoId로 중복 체크용 검색  

---

### 3.2 `JobRepository` (`job_repo.py`)

**Path**: `users/{uid}/jobs/{jobId}`

**주요 기능**

- `create_job(uid, job_id, data)`: jobId는 외부(view)에서 생성해 전달
- `get_job / update_job / delete_job / exists_job`
- `list_jobs(uid, limit)`: 최신순 목록
- `get_latest_job_by_video(uid, video_id)`: 특정 video의 가장 최근 job
- `get_active_job_by_video(uid, video_id)`: 특정 video의 active job 조회(확장용)
  - active statuses: `queued`, `downloading`, `uploading`, `processing`  

---

### 3.3 `AnalysisResultRepository` (`analysis_result_repo.py`)

**Path**: `users/{uid}/videos/{videoId}/analysis_results/{resultId}`

**주요 기능**

- `create_result(uid, video_id, subtitle_source) -> resultId`
  - Storage 경로(`resultPath`)는 repo에서 생성
- `get_result / update_result / delete_result / exists_result`
- `list_results(uid, video_id, limit)`: 최신순 결과 히스토리
- `get_result_path(uid, video_id, result_id)`: Firestore 문서에서 resultPath만 조회  
  
---

### 3.4 `FeedbackRepository` (`feedback_repo.py`)

**Path**: `users/{uid}/videos/{videoId}/feedbacks/{feedbackId}`

**주요 기능**

- `create_feedback(uid, video_id, data) -> feedbackId`
- `get_feedback / update_feedback / delete_feedback / exists_feedback`
- `list_feedbacks(uid, video_id, limit)`: 최신순 목록

## 4. Services

Service는 Repository를 조합해 **검증/규칙/도메인 에러**를 담당합니다.  
(※ 서비스별로 `NotFoundError`, `BadRequestError`, `ConflictError를 사용`)

---

### 4.1 `JobService` (`job_service.py`)

Job 상태 전이/검증 로직 담당.

**주요 기능**

- `create_job(uid, job_id, video_id, status="queued")`
- `get_job, list_jobs, delete_job`
- `get_latest_job_by_video, get_active_job_by_video`
- `update_status(uid, job_id, new_status, error=None)`
  - 유효 상태 검증
  - 상태 전이는 `ALLOWED_NEXT` 규칙 기반 (단, `failed`는 어디서든 가능)
  - `failed`이면 error 기록, `done`이면 error 정리
- `fail_job(uid, job_id, error)`: status를 failed로 변경, error 작성

---

### 4.2 `VideoService` (`video_service.py`)

YouTube URL 검증 + video 생성/수정 + 중복 방지.

**주요 기능**

- `create_video(uid, title, youtube_url, duration_sec=None)`
  - title 필수
  - youtube url에서 youtubeVideoId 추출
  - `youtubeVideoId` 기준 중복이면 `ConflictError`
- `get_video_with_status(uid, video_id)`: status 포함된 video 리턴
- `list_videos_with_status(uid, limit)`: status 포함된 video list 리턴
- `update_video_storage_path(uid, video_id) -> storagePath`
  - status가 `processing`으로 바뀌었을 때 호출
  - `storagePath` 값 채움
- `update_video(uid, video_id, patch)`: title, durationSec 부분 수정

---

### 4.3 `AnalysisResultService` (`analysis_result_service.py`)

분석 결과(result) 히스토리 관리 + 입력값 검증.

**주요 기능**

- `create_result(uid, video_id, subtitle_source="youtube")`
- `get_result / list_results / delete_result`
- `get_result_path(uid, video_id, result_id) -> resultPath`: result 저장된 storage 경로 리턴
- `get_latest_result(uid, video_id)`: 특정 video의 가장 최근 result 리턴
- `update_subtitle_source(uid, video_id, result_id, subtitle_source)`

---

### 4.4 `FeedbackService` (`feedback_service.py`)

Feedback 규칙 검증:

- rating 필수 (1~5)
- comment 선택 (공백만 불가)

**주요 기능**

- `create_feedback(uid, video_id, rating, comment=None)`
- `get_feedback / list_feedbacks / delete_feedback`
- `update_feedback(uid, video_id, feedback_id, patch)`: rating/comment 부분 수정

## 5. DRF Views: Exception Mapping (필수)

Service 계층은 도메인 에러(`NotFoundError`, `BadRequestError`, `ConflictError`)를 raise 합니다.
**Views(DRF)** 에서 이를 DRF 예외/응답으로 변환하는 로직이 필요합니다.

권장 매핑 예시:

- `NotFoundError` → `rest_framework.exceptions.NotFound` (HTTP 404)
- `BadRequestError` →
  - 입력 필드 오류 dict 형태면 `ValidationError` (HTTP 400)
  - 일반 메시지는 `Response({"detail": ...}, status=400)` 또는 `ValidationError`
- `ConflictError` → `Response({"detail": ...}, status=409)`

추가로, 필요 시 내부 에러는 `APIException(500)` 또는 로깅 후 공통 에러 응답으로 처리합니다.

## 6. Notes / Conventions

- `createdAt`, `updatedAt`은 repository에서 `firestore.SERVER_TIMESTAMP`로 처리
- analysis 결과 본문은 Firestore에 저장하지 않고 Storage(`resultId.json`)에 저장하며 Firestore에는 `resultPath`만 저장
- jobId 생성 위치: **views.py** (API 요청 처리 단)

---

## 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|--------|
| v1.0 | 2026-02-28 | 리드미 초안 작성 |

---