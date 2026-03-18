# SoundSight

**영상 콘텐츠의 청각적 감정을 시각적 경험으로 변환하여 청각장애인에게 전달하는 서비스**

> Google Solution Challenge 2026 · GDGoC Ewha

---

## 프로젝트 소개

현재의 자막(CC) 시스템은 대사와 "[음악 재생 중]" 수준의 환경음 라벨링만을 제공합니다. 그러나 영상 콘텐츠에서 감정 전달의 30~40%는 배경음악, 효과음, 음성의 톤 등 청각적 요소에 의존합니다.

SoundSight는 영상의 시각 정보, 오디오 특성, 자막 텍스트를 Gemini 멀티모달 API로 종합 분석하여 **감정 상태를 추론**하고, 이를 시각적 효과(화면 테두리 색상, 자막 타이포그래피, 배경 비네팅, 감정 인디케이터, 진동 패턴)로 변환하여 청각장애인에게 전달합니다.

**대상 SDG**: SDG 10 (불평등 감소) · SDG 4 (양질의 교육)

## 아키텍처

```
[영상 입력 (YouTube URL / 업로드)]
        │
[Layer 1] 오디오 특성 추출 엔진
  librosa · torchaudio · Whisper
  → 템포, 키, 에너지, 스펙트럼, 무음, onset
        │
[Layer 2] 감정 컨텍스트 RAG
  Vertex AI Embeddings · FAISS
  → 장르별 음악-감정 패턴 검색
        │
[Layer 3] Gemini API (멀티모달 추론)
  Input: 영상 프레임 + 오디오 피처 + 자막 + RAG 결과
  Output: 구간별 감정 상태 JSON
        │
[Layer 4] 감정-시각 매핑 엔진
  → 테두리 색상, 자막 효과, 비네팅, 진동 패턴
        │
[사용자: 영상 + 감정 시각화 오버레이 재생]
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 멀티모달 추론 | Gemini API |
| 오디오 분석 | librosa, torchaudio, Whisper |
| 벡터 검색 / RAG | Vertex AI Embeddings, FAISS |
| Backend | Django REST Framework |
| Frontend | React Native (TypeScript) |
| 인프라 / DB | Firebase (Firestore, Storage, Auth), GCP |

## 프로젝트 구조

```
soundsight/
├── ai-pipeline/            # AI 파이프라인 (Python)
│   ├── audio_extractor/    # Layer 1: 오디오 특성 추출
│   ├── rag/                # Layer 2: 감정 컨텍스트 RAG
│   ├── gemini/             # Layer 3: Gemini 추론 로직
│   └── tests/
├── backend/                # Django 백엔드
│   ├── api/                # REST API 엔드포인트
│   ├── models/
│   └── config/
├── frontend/               # React Native 프론트엔드
│   └── src/
├── data/                   # 감정 패턴 DB, 테스트 데이터
├── docs/                   # 프로젝트 문서
│   ├── emotion_schema.md
│   ├── emotion_expression_design.md
│   └── api_spec.md
├── .github/                # GitHub 설정
│   └── PULL_REQUEST_TEMPLATE.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## 시작하기

### 사전 요구사항

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- GCP 프로젝트 + Gemini API 키
- Firebase 프로젝트

### 환경 설정

```bash
# 1. 레포 클론
git clone https://github.com/{username}/soundsight.git
cd soundsight

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력

# 3. Docker로 전체 환경 실행
docker-compose up --build

# 또는 개별 실행:

# Backend
cd backend
pip install -r requirements.txt
python manage.py runserver

# Frontend
cd frontend
npm install
npx react-native start

# AI Pipeline (단독 테스트)
cd ai-pipeline
pip install -r requirements.txt
python -m pytest tests/
```

### 환경 변수 (.env)

```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
DJANGO_SECRET_KEY=your_django_secret_key
ALLOWED_HOSTS=localhost,127.0.0.1
GOOGLE_APPLICATION_CREDENTIALS=./secret/serviceAccountKey.json
VERTEX_AI_LOCATION=asia-northeast3
```

Cloud Run에서는 `GOOGLE_APPLICATION_CREDENTIALS`를 설정하지 않고, 서비스에 연결된 GCP 서비스 계정의 기본 인증(ADC)을 사용합니다.

### Cloud Run 데모 배포

백엔드 이미지를 Cloud Build로 빌드하고 바로 Cloud Run에 배포하려면 루트의 `cloudbuild.backend.yaml`을 사용합니다.

```bash
gcloud builds submit \
  --config cloudbuild.backend.yaml \
  --substitutions=_IMAGE_TAG=main-430e225 \
  .
```

Cloud Run 단일 서비스로 데모를 돌릴 때는 `CELERY_TASK_ALWAYS_EAGER=true`를 사용하면 별도 Redis/Celery worker 없이도 분석 태스크가 같은 컨테이너 안에서 실행됩니다.

### 프론트엔드 연동

프론트 앱은 아래 환경변수만 채우면 Firebase 로그인 + 백엔드 API 호출 흐름을 사용할 수 있습니다.

```bash
cp frontend/.env.example frontend/.env
```

필수 항목:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_BACKEND_URL` 예: `https://soundsight-xxxxx.us-central1.run.app`

브라우저 기반 Expo web 데모를 쓸 경우 백엔드에 `CORS_ALLOWED_ORIGINS`도 함께 설정해야 합니다.

## 팀

| 이름 | 역할 | 담당 |
|------|------|------|
| 신우림 | PM / AI Lead | 총괄 기획, Layer 1·2·3, 감정 표현 체계 설계 |
| 정희진 | Frontend | Layer 4 (감정-시각 매핑), 영상 플레이어, UI/UX |
| 진웨이얀 | Backend + AI 보조 | Django API, AI 파이프라인 통합, Whisper STT |
| 민지인 | 인프라 + Backend 보조 | Firebase, Firestore, GCP 설정, 배포 |

## 라이선스

MIT License
