# GitHub 레포 세팅 가이드

이 문서는 신우림이 GitHub 레포를 처음 생성하고 설정하는 단계별 가이드입니다.

---

## 1단계: 레포 생성

1. GitHub 로그인 → 우측 상단 `+` → `New repository`
2. 설정:
   - Repository name: `soundsight`
   - Description: `영상 콘텐츠의 청각적 감정을 시각적 경험으로 변환하는 서비스 | Google Solution Challenge 2026`
   - Visibility: **Public** (Solution Challenge 제출 시 Public 필요)
   - Initialize: `Add a README file` 체크 해제 (우리가 직접 push할 것)
   - .gitignore: `None` (우리가 직접 만든 .gitignore 사용)
   - License: `MIT License` 선택
3. `Create repository` 클릭

## 2단계: 로컬 초기화 및 첫 push

```bash
# 작업할 폴더 생성
mkdir soundsight
cd soundsight

# git 초기화
git init
git branch -M main

# 이 레포에 포함된 파일들을 soundsight/ 폴더에 복사한 후:
# (README.md, CONTRIBUTING.md, .gitignore, .env.example, .github/ 폴더 등)

# 디렉토리 구조 생성
mkdir -p ai-pipeline/audio_extractor
mkdir -p ai-pipeline/rag
mkdir -p ai-pipeline/gemini
mkdir -p ai-pipeline/tests
mkdir -p backend/api
mkdir -p backend/models
mkdir -p backend/config
mkdir -p frontend/src
mkdir -p data
mkdir -p docs

# 빈 디렉토리가 git에 추적되도록 .gitkeep 추가
touch ai-pipeline/audio_extractor/.gitkeep
touch ai-pipeline/rag/.gitkeep
touch ai-pipeline/gemini/.gitkeep
touch ai-pipeline/tests/.gitkeep
touch backend/api/.gitkeep
touch backend/models/.gitkeep
touch backend/config/.gitkeep
touch frontend/src/.gitkeep
touch data/.gitkeep
touch docs/.gitkeep

# 첫 커밋
git add .
git commit -m "chore: 프로젝트 초기 구조 및 문서 세팅"

# 원격 연결 및 push
git remote add origin https://github.com/{your_username}/soundsight.git
git push -u origin main
```

## 3단계: dev 브랜치 생성

```bash
# dev 브랜치 생성 및 push
git checkout -b dev
git push -u origin dev
```

## 4단계: Labels 생성

Issues → Labels에서 아래 라벨 생성:

| 라벨 | 색상 | 설명 |
|------|------|------|
| `layer-1` | #0E8A16 (초록) | 오디오 특성 추출 |
| `layer-2` | #1D76DB (파랑) | 감정 컨텍스트 RAG |
| `layer-3` | #5319E7 (보라) | Gemini 멀티모달 추론 |
| `layer-4` | #D93F0B (주황) | 감정-시각 매핑 |
| `backend` | #FBCA04 (노랑) | Django 백엔드 |
| `frontend` | #E99695 (분홍) | React Native 프론트엔드 |
| `infra` | #C5DEF5 (연파랑) | Firebase/GCP 인프라 |
| `docs` | #0075CA (파랑) | 문서 |
| `bug` | #D73A4A (빨강) | 버그 |
| `urgent` | #B60205 (진빨강) | 긴급 |

## 5단계: 팀원 온보딩 안내

팀원들에게 아래 메시지를 전달합니다:

```
[SoundSight GitHub 온보딩]

1. GitHub 초대 수락해 주세요 (메일 확인)
2. 레포 클론:
   git clone https://github.com/RainyForest23/2026-SolutionChallenge.git
   cd 2026-SolutionChallenge
   git checkout dev
3. 환경 변수 설정:
   cp .env.example .env
   (.env 파일에 API 키는 제가 카톡으로 공유할게요)
4. CONTRIBUTING.md 필독! (브랜치 전략, 커밋 규칙)
5. 작업 시작할 때:
   git checkout dev
   git pull origin dev
   git checkout -b feature/{이름}-{기능명}
```

---

## 체크리스트

- [ ] 레포 생성 완료
- [ ] 초기 파일 push 완료 (README, CONTRIBUTING, .gitignore, .env.example, 디렉토리 구조)
- [ ] dev 브랜치 생성 완료
- [ ] Labels 생성 완료
- [ ] 팀원 온보딩 메시지 전달 완료
