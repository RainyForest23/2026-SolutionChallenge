# GCP & Firebase 인프라 설정 문서

## 1. GCP 프로젝트 정보

- 프로젝트 이름: soundsight-dev
- 프로젝트 ID: soundsight-dev
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

- 기본 버킷: soundsight-dev.firebasestorage.app
- 리전: us-central1
- Cloud Run과 동일 리전 유지

---

## 4. 활성화된 API 목록

- Firestore API
- Firebase Authentication
- Firebase Storage

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

### 필수 환경 변수

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