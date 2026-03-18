# SoundSight API 연동 테스트 요구사항 명세서 (API Test Requirements Specification)

## 1. 개요

본 명세서는 SoundSight 프로젝트의 핵심 태스크 중 **AI 파이프라인 ↔ 백엔드(BE) ↔ 프론트엔드(FE) 통합 및 API 연동 테스트**를 원활하게 수행하기 위한 테스트 목표, 시나리오, 검증 항목을 정의합니다.

### 1.1 대상 태스크 (기반 이슈)

- FE-BE API 연동 테스트 + 버그 수정
- AI 파이프라인-BE 연동 테스트 + 버그 수정
- 분석 결과(감정 타임라인 JSON) Firestore 저장 + FE 조회 API
- API 에러 핸들링 + 응답 포맷 통일
- End-to-End 통합 테스트: URL 입력 -> 감정 시각화 재생
- 분석 상태 실시간 업데이트 (Firestore 리스너 또는 폴링)

---

## 2. 모듈별 테스트 요구사항

### 2.1 BE ↔ AI 파이프라인 연동 테스트 (Backend 내부 통합)

백엔드(Django 비동기 큐/Celery)에서 AI 파이프라인 코드를 호출하고 분석 결과를 반환받는 구간입니다.

| Test ID | 통합 대상 | 테스트 항목 (시나리오) | 기대 결과 | 비고 |
|---------|----------|----------------------|----------------|------|
| `AI-01` | BE -> AI | 영상/오디오 파일 전달 | 백엔드가 저장한 임시 파일이나 추출된 YouTube 오디오를 `pipeline.py`가 정상적으로 인덱싱하고 로드함 | 입력 검증 |
| `AI-02` | AI(레이어 1) | 오디오 피처 추출 로직 성공 | `ffmpeg` 및 `librosa`가 에러 없이 작동하여 설정된 구간(예: 10초) 단위로 에너지/템포 피처 JSON 배열을 성공적으로 리턴함 | |
| `AI-03` | AI(레이어 3) | Gemini 멀티모달 프롬프트 | 프레임+자막+오디오 피처 데이터를 API에 주입 시, 8개 감정 라벨이 포함된 명세화된 JSON을 포맷 에러 없이 반환함 | |
| `AI-04` | AI -> BE | 처리 완료 후 결과 반환 | AI 파이프라인이 파싱하기 쉬운 Python Dict 구조(또는 JSON 텍스트)로 완성된 분석 데이터를 백엔드로 전달함 | 성공 응답 |
| `AI-05` | AI/BE 예외 | 파이프라인 중간 오류 던지기 | 다운로드 실패, 할당량 초과, 메모리 에러 발현 시 명확한 Exception을 던지며, 백엔드는 해당 Job Status를 `failed`로 기록 | 예외 처리 |

### 2.2 FE ↔ BE (API) 연동 테스트

React Native 앱(FE)에서 Django(BE) 엔드포인트를 호출하고 응답 상태를 렌더링하는 구간입니다.

| Test ID | API 엔드포인트 | 테스트 항목 (시나리오) | 기대 결과 | 비고 |
|---------|--------------|----------------------|----------------|------|
| `API-01` | 공통(Auth) | Firebase ID Token 인증 | HTTP Header에 `Authorization: Bearer <TOKEN>` 전달 성공. 누락/만료 시 `401 Unauthorized` 반환 | 보안 |
| `API-02` | `POST /analyze` | 감정 분석 작업 요청 | 유효한 YouTube URL 전달 시 즉시 작업 큐에 등록되며, `202 Accepted` 및 `job_id`, `status: queued` 반환 | 큐 트리거 |
| `API-03` | `GET /status` | 상태 조회 (폴링) | 특정 `job_id` 요청 시 현재 파이프라인 진행 상태(`downloading`, `processing` 등)를 올바르게 응답함 | 상태 관리 |
| `API-04` | `GET /result` | 결과 도출 확인 | 분석 완료 상태(`done`)일 때 호출 시 프론트엔드 렌더링 규격(Schema)에 맞는 전체 JSON 데이터를 반환함 | 최종 결과 |
| `API-05` | FE/BE 예외 | 잘못된 요청 방어 (400) | URL 포맷 오류, 누락 파라미터 발생 시 협의된 HTTP 상태 및 `{ "detail": "에러 설명" }` 구조에 맞추어 응답 | 클라이언트 에러 |

### 2.3 데이터베이스/인프라 (Firebase) 통신 연동

백엔드가 Firebase(Firestore, Storage) 리소스와 통신하여 데이터를 처리하는 구간입니다.

| Test ID | 서비스 요소 | 테스트 항목 (시나리오) | 기대 결과 | 비고 |
|---------|---------|----------------------|----------------|------|
| `DB-01` | Storage | 미디어 파일 사전 업로드 | `upload_id` 로직이 필요한 경우, Firebase Storage 업로드 및 서명된(Signed) 다운로드 URL이 백엔드로 정상 전달됨 | 직접 업로드 |
| `DB-02` | Firestore | 최종 결과 문서 삽입 | 분석이 끝난 결과 JSON이 Firestore의 `analysis_results` 관련 컬렉션에 유실 없이 저장됨 | 생성 권한 |
| `DB-03` | Firestore | DB 리딩 처리 | `GET /api/result` 호출 시, 여러 Document 중 조건(`job_id`, `video_id`)이 매칭되는 문서 1건을 정확히 읽어서 전달 | 조회 안정성 |

---

## 3. End-to-End(E2E) 시스템 통합 테스트 시나리오

사용자의 앱 사용 흐름 전체를 모방한 워크플로우 테스트입니다.

### 시나리오 A: Happy Path (안정적인 통합 흐름 파싱)

1. **[FE] 요청**: 사용자가 YouTube 비디오 URL을 입력하고 '분석 시작' 클릭.
2. **[FE -> BE] 큐 트리거**: `POST /api/analyze` → BE에서 `job_id=XYZ`, `status: queued` 반환. FE는 로딩(분석중) 화면 표시.
3. **[BE -> AI] 비동기 분석**: 백엔드 워커가 `pipeline.py`를 호출 → 비디오/비디오 다운로드 → Layer 1, Layer 3 구동 완료.
4. **[BE -> DB] 결과 캐싱**: 워커가 생성된 JSON을 Firestore에 저장하고 해당 Job을 `done` 상태로 트랜잭션.
5. **[FE -> BE] 폴링 종료**: FE가 X초(예: 3초) 주기로 `GET /api/status?job_id=XYZ`를 폴링하다가 `done` 수신하여 렌더링 화면으로 전환.
6. **[FE -> BE] 데이터 페치**: `GET /api/result?job_id=XYZ`로 전송받은 감정 데이터 JSON 취득.
7. **[FE UI] 시각 효과 렌더링**: 비디오 재생 Timestamp를 동기화하며, 화면 테두리 글로우, 자막 효과, 비네팅, 햅틱(진동) UI 컴포넌트(`Layer 4`)가 JSON에 맞춰 실시간으로 반응 및 조작됨.

### 시나리오 B: Error Handling (AI 파이프라인/비정상 오류 발생)

1. **[FE] 파라미터 전달**: 재생 불가능한 오류 URL 또는 너무 긴 길이의 영상 요청.
2. **[AI] Exception Throw**: `pipeline.py` 오디오 추출 단계 실패, 또는 Gemini API 할당량/타임아웃 발생으로 분석 실패.
3. **[BE] 상태 패치**: Exception을 캐치한 큐 워커가 Job 테이블 Status를 `failed` 로 변경.
4. **[FE -> BE] 롤백 처리**: 폴링 중이던 FE가 `status: failed`를 수신.
5. **[FE UI] 알림 및 복구**: 로딩 화면을 즉각 중지하고 사용자에게 "분석 중 문제가 발생했습니다: (에러 사유)" 알림/토스트 노출 후 입력 창으로 복귀.

---

## 4. 즉각 점검(Action Point) 및 협의 필요 사항

- **프론트엔드 폴링 주기 확정**: 현재 `GET /api/status` 호출 간격 최적화(너무 짧으면 서버 부하 및 API 과다 호출, 길면 지연 응답)
- **더미 JSON(Mock) 테스트 모드 활성화**: 백엔드와 AI 파이프라인의 연동이 조금 지연될 경우, 백엔드에서 강제로 `status: done` 과 하드코딩된 더미 JSON을 즉시 반환하도록 하여, 프론트엔드가 Layer 4 (오버레이) 테스트를 중단 없이 진행할 수 있게 조치 필요.
- **표준 에러 코드 핸들링 (`API 에러 핸들링 + 응답 포맷 통일`)**: 백엔드의 `400` / `500` HTTP 응답에 대해 일관된 `error_code` 키 제공 협의 (현재 `API_SPEC.md` 상으로는 `{"detail": "..."}` 의 구조로만 통일됨).
