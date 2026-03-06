# GCP & Firebase 인프라 설정 문서

## 1. GCP 프로젝트 정보

- 프로젝트 이름: 2026-sc-soundsight
- 프로젝트 ID: sc-soundsight
- 결제 플랜: Blaze (무료 크레딧 사용 중)
- 기본 리전: us-central1

---

## 2. Firestore 설정

- 모드: Standard
- 리전: us-central1
- 현재 데이터 상태: 초기 상태 (데이터 없음)
- Cloud Run과 동일 리전으로 통일하여 지연 시간 및 비용 최적화

---

## 3. Firebase Storage 설정

- 기본 버킷: sc-soundsight.firebasestorage.app
- 리전: us-central1
- Cloud Run과 동일 리전 유지

---

## 4. 활성화된 API 목록

- Firestore API
- Firebase Authentication
- Firebase Storage
- Vertex AI API (Gemini 모델 호출용)

---

## 5. IAM 권한 정책

| 역할 | 설명 |
|------|------|
| Owner | 인프라 담당자 |
| Editor | 백엔드 / AI 개발자 |
| Vertex AI 사용자 | Vertex 모델 사용 권한 |

원칙:

- 서비스 계정 키(JSON)는 GitHub에 업로드하지 않는다.
- 운영 API Key는 Cloud Run 환경 변수로만 관리한다.

---

## 6. 환경 변수 관리 정책

- `.env` 파일은 로컬 전용
- `.env.example`만 Git에 업로드
- 운영 비밀값은 Cloud Run 환경 변수로 주입

### 필수 환경 변수 (예시)

- `GOOGLE_APPLICATION_CREDENTIALS`: GCP 서비스 계정 JSON 파일 경로 (Backend)
- `FIREBASE_API_KEY`: Firebase 설정용 Web API Key (Frontend/Backend)
- `FIREBASE_AUTH_DOMAIN`: sc-soundsight.firebaseapp.com
- `FIREBASE_PROJECT_ID`: sc-soundsight
- `FIREBASE_STORAGE_BUCKET`: sc-soundsight.firebasestorage.app

---

## 7. 보안 원칙

- API Key 및 서비스 계정 JSON은 절대 Git에 업로드 금지
- 모든 AI 모델 호출은 서버(Backend)를 통해서만 수행
- 프론트엔드에서 직접 Gemini 호출 금지

---

## 8. 리전 통일 원칙

- Cloud Run: us-central1
- Firestore: us-central1
- Storage: us-central1
- Vertex AI: us-central1

→ 비용 최적화 및 네트워크 지연 최소화 목적

---

## 9. 성능 최적화 및 확장성 아키텍처 (추가 권장 사항)

긴 비디오 처리와 AI 모델 분석 등 고부하 작업을 안정적으로 처리하기 위해 다음 아키텍처 도입을 적극 권장합니다.

- **Cloud Storage + Pub/Sub (또는 Eventarc):** 클라이언트가 영상을 직접 Storage에 업로드(Signed URL)하고, 업로드 완료 이벤트를 Pub/Sub이 감지해 백엔드를 호출합니다. (초대용량 파일 업로드 시 서버 대기 리소스 낭비 방지)
- **Cloud Tasks (비동기 처리 큐):** 수십 초 이상 소요되는 AI 분석 요청(Layer 1~3 파이프라인)을 큐(Queue)에 넣고 백엔드 워커가 여유롭게 순차 처리하도록 하여 타임아웃(HTTP 504) 방지 및 재시도를 보장합니다.
- **Firestore Realtime Listener (`onSnapshot`):** 비동기로 분석이 완료되어 Firestore에 결과 문서가 업데이트되는 즉시, 프론트엔드가 실시간으로 감지하여 화면을 결과창으로 자동 전환합니다. (서버 Polling 불필요)
- **Vertex AI Context Caching:** 나중에 기능이 확장되어 긴 동영상 원본이나 방대한 프롬프트 컨텍스트(Emotion Schema 등)를 전달할 경우, 이를 캐싱해두어 반복 API 호출 시 토큰 비용 대폭 절감 및 응답 속도를 향상시킵니다.
