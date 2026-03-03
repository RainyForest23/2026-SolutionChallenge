# SoundSight Firestore 스키마 명세서 (v2.0)

## 0. 개요

SoundSight는 사용자가 입력한 YouTube URL을 기반으로 백엔드가 영상을 다운로드(yt-dlp)하여 Firebase Storage에 업로드하고,
AI 분석 결과를 `{resultId}.json` 형태로 Storage에 저장한 뒤, 프론트(RN/Expo)가 **원본 영상 + {resultId}.json 오버레이 데이터를 실시간 합성**하여 시각 효과를 렌더링한다.

- **영상 파일 저장소**: Firebase Storage (GCS)
- **상태/메타데이터 저장소**: Firestore
- **분석 결과 본문**: Storage에 `{resultId}.json` 파일로 저장, Firestore에는 `resultPath`(포인터)만 저장
- **식별자**
  - `uid`: Firebase Auth 사용자 고유 ID
  - `videoId`: analyze 시점에 발급되는 영상(콘텐츠) ID
  - `jobId`: 비동기 파이프라인 작업(다운로드/업로드/분석) 실행 ID

## 1. 설계 원칙

- 사용자별 데이터 격리
- 조회 중심 설계
- 결과(result)는 Firestore에 직접 저장하지 않고 Storage에 `result.json`으로 저장
- createdAt, updatedAt은 모두 repository에서 찍음

## 2. Collection Structure

- 혼선 방지를 위해 모든 경로는 firestore_service/repositories/paths.py에 상수 형태로 저장

```
users/{uid}
users/{uid}/videos/{videoId}
users/{uid}/videos/{videoId}/analysis_results/{resultId}
users/{uid}/videos/{videoId}/feedbacks/{feedbackId}
users/{uid}/jobs/{jobId}
```

## 3. Document Schemas
### 3.1 User Document

**Path**: `users/{uid}`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `uid` | string | O | Owner UID |
| `email` | string | O | 사용자 email |
| `provider` | string | O | 로그인 방법. `google` 또는 `password` |
| `displayName` | string | X | 닉네임. 초기값 = Google `Name` |
| `photoURL` | string | X | Google 프로필 이미지 URL |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |
| `lastLoginAt` | timestamp | O | Server timestamp |

### 3.2 Video Document

**Path**: `users/{uid}/videos/{videoId}`

YouTube URL 기반 분석 요청 시, analyze 시점에 video 문서를 먼저 생성한다.
sourceType의 기본값은 youtube, currentStatus의 기본값은 queued.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `uid` | string | O | Owner UID |
| `title` | string | O | 동영상 제목 |
| `durationSec` | int | X | 동영상 길이 |
| `sourceType` | string | O | 우선 `youtube` 고정 |
| `youtubeUrl` | string | O | 입력된 YouTube URL |
| `youtubeVideoId` | string | O | 입력된 YouTube 영상의 id |
| `storagePath` | string | X | Storage 내부 경로 (업로드 완료 후 채움) 예: `videos/{uid}/{videoId}.mp4` |
| `currentStatus` | string | O | 현재 job의 status |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

> 주의: 파이프라인 진행 상태는 기본적으로 **Job Document**(3.4)에서 관리한다.  

### 3.3 Analysis Result Document

**Path**: `users/{uid}/videos/{videoId}/analysis_results/{resultId}`

분석 결과 본문은 Firestore에 직접 저장하지 않고, Storage의 `result.json`에 저장한다.  
Firestore에는 그 위치를 가리키는 포인터(`resultPath`) 및 최소 메타만 저장한다.  
동영상 재분석 가능

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `resultPath` | string | O | Storage 경로. 예: `results/{uid}/{videoId}/{resultId}.json` |
| `subtitleSource` | string | O | 자막 출처. 예: `gemini` , `YouTube` , `사용자 직접 입력` |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

### 3.4 Feedback Document

**Path**: `users/{uid}/videos/{videoId}/feedbacks/{feedbackId}`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `rating` | number | O | 1–5 rating |
| `comment` | string | X | 사용자 코멘트 |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

### 3.5 Job Document (상태 폴링용)

**Path**: `users/{uid}/jobs/{jobId}`

프론트는 `/api/status`를 통해 job 상태를 폴링한다.  
Job은 **다운로드/업로드/AI 처리까지 전체 파이프라인**의 진행 상황을 나타낸다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `jobId` | string | O | 작업 ID |
| `videoId` | string | O | 연결된 videoId |
| `status` | string | O | 아래 상태값 참고 |
| `error` | string / null | O | 실패 시 에러 메시지 |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

#### 상태값 정의

| 상태 | 의미 | 다음 액션 |
|------|------|---------|
| `queued` | 작업이 생성되고 대기열에 등록됨 | 폴링 계속 |
| `downloading` | 백엔드가 yt-dlp로 YouTube 영상 다운로드 중 | 폴링 계속 |
| `uploading` | Firebase Storage에 업로드 중 | 폴링 계속 |
| `processing` | AI 파이프라인(Gemini 등) 실행 중 | 폴링 계속 |
| `done` | 완료됨 | `/api/result` 호출 |
| `failed` | 오류 발생 | `error` 필드 확인 |

## 4. Storage 구조

영상 및 결과 JSON은 Firebase Storage에 저장한다.
- videos/{uid}/{videoId}.mp4
- results/{uid}/{videoId}/{resultId}.json
추후 확장 가능성을 위해 추가
- audios/{uid}/{videoId}/{audioId}.mp3

## 5. 향후 확장 고려 사항

- 관리자용 전체 비디오 조회 기능
- Soft Delete(소프트 삭제) 지원
  - deletedAt 필드를 추가하여 실제 삭제 대신 논리 삭제 처리

---

## 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|--------|
| v1.0 | 2026-02-27 | 초기 스키마 작성 |
| v2.0 | 2026-03-03 | User 스키마 추가 |

---
