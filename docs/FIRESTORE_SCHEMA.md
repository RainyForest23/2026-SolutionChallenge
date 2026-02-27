## FIRESTORE DATA MODEL

### 1. 설계 원칙

- 사용자별 데이터 격리
- Feedback은 Video 단위
- 조회 중심 설계
- MVP 기준 (전체 조회 미포함)

### 2. Collection Structure
```
users/{uid}/videos/{videoId}
users/{uid}/videos/{videoId}/analysis/result
users/{uid}/videos/{videoId}/feedback/{feedbackId}
```

### 3. Document Schemas
#### 3.1 Video Document

**Path**: `users/{uid}/videos/{videoId}`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `uid` | string | O | Owner UID |
| `title` | string | O | Video title |
| `status` | string | O | UPLOADING | ANALYZING | DONE | FAILED |
| `storagePath` | string | O | GCS path |
| `durationSec` | number | X | Video length |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

#### 3.2 Analysis Result

**Path**: `users/{uid}/videos/{videoId}/analysis/result`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `summary` | string | O | Overall summary |
| `segments` | array | X | Segment-level analysis |
| `modelVersion` | string | O | Model version |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

#### 3.3 Feedback

**Path**: `users/{uid}/videos/{videoId}/feedback/{feedbackId}`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `rating` | number | X | 1–5 rating |
| `createdAt` | timestamp | O | Server timestamp |
| `updatedAt` | timestamp | O | Server timestamp |

### 4. Index 고려사항

- `videos` 컬렉션은 기본적으로 `createdAt` 기준 내림차순 정렬 조회를 사용함
(예: 최신 업로드 영상 목록)
- 필요 시 `status` 필드를 기준으로 필터링할 수 있음
(예: `DONE` 상태의 영상만 조회)
- 다음과 같은 쿼리 조합에서는 복합 인덱스(Composite Index) 가 필요할 수 있음:
  - `uid + createdAt`
  - `uid + status + createdAt`

### 5. 향후 확장 고려 사항

- 관리자용 전체 비디오 조회 기능
- Soft Delete(소프트 삭제) 지원
  - deletedAt 필드를 추가하여 실제 삭제 대신 논리 삭제 처리
- 분석 결과 재생성(Re-generation) 기능 지원
  - 향후 video당 여러 analysis 결과를 허용하는 구조로 확장 가능