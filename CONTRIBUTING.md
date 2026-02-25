# Contributing Guide

SoundSight 프로젝트의 협업 규칙입니다. 전원 숙지 후 작업해 주세요.

---

## 브랜치 전략

```
main          ← 배포 가능 상태만. 직접 push 금지.
  └── dev     ← 개발 통합 브랜치. feature 머지 대상.
       ├── feature/woorim-audio-extractor
       ├── feature/heejin-emotion-overlay
       ├── feature/weiyan-django-api
       └── feature/jiin-firebase-setup
```

### 규칙

1. **main에 직접 push하지 않습니다.** 반드시 dev를 거칩니다.
2. **dev에 직접 push하지 않습니다.** 반드시 feature 브랜치에서 PR을 생성합니다.
3. feature 브랜치 네이밍: `feature/{이름}-{기능}` (예: `feature/woolim-layer1-audio`)
4. 핫픽스: `hotfix/{이름}-{설명}` (예: `hotfix/weiyan-api-500-error`)

### 브랜치 생명주기

```bash
# 1. dev에서 최신 코드 가져오기
git checkout dev
git pull origin dev

# 2. feature 브랜치 생성
git checkout -b feature/woorim-layer1-audio

# 3. 작업 후 커밋
git add .
git commit -m "feat: librosa 오디오 피처 추출 파이프라인 구현"

# 4. 원격에 push
git push origin feature/woorim-layer1-audio

# 5. GitHub에서 PR 생성 (feature → dev)

# 6. 리뷰 후 머지되면 로컬 브랜치 삭제
git checkout dev
git pull origin dev
git branch -d feature/woorim-layer1-audio
```

---

## 커밋 메시지 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다.

### 형식

```
<type>: <description>

[optional body]
```

### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat: Gemini 감정 분석 프롬프트 v1 구현` |
| `fix` | 버그 수정 | `fix: JSON 스키마 intensity 범위 오류 수정` |
| `refactor` | 리팩토링 (기능 변경 없음) | `refactor: audio_extractor 모듈 분리` |
| `docs` | 문서 변경 | `docs: API 명세서 업데이트` |
| `style` | 코드 포맷팅 (기능 변경 없음) | `style: lint 적용` |
| `test` | 테스트 추가/수정 | `test: Layer 1 피처 추출 단위 테스트 추가` |
| `chore` | 빌드, 설정 등 기타 | `chore: Docker 설정 파일 추가` |

### 규칙

- 한국어 또는 영어 모두 가능하나, **하나의 커밋 내에서 언어를 섞지 않습니다.**
- 제목은 50자 이내로 작성합니다.
- 제목 끝에 마침표를 붙이지 않습니다.
- 명령형으로 작성합니다. ("추가했음" 대신 "추가")

### 예시

```
feat: Layer 1 오디오 피처 추출 파이프라인 구현

- librosa 기반 템포, 키, 에너지, 스펙트럼 중심 추출
- 10-15초 구간 단위 자동 분할
- 출력 형식: emotion timeline JSON schema v1 준수
```

---

## Pull Request 규칙

### PR 생성 시

1. PR 제목은 커밋 컨벤션과 동일한 형식으로 작성합니다.
2. PR 템플릿을 반드시 채웁니다 (자동 생성됨).
3. 담당 레이블을 추가합니다: `layer-1`, `layer-2`, `layer-3`, `layer-4`, `backend`, `frontend`, `infra`, `docs`
4. Reviewer를 최소 1명 지정합니다.

### 리뷰 규칙

- **24시간 내 리뷰를 완료합니다.** 바쁘면 카톡으로 리뷰 요청.
- 최소 1명의 Approve가 있어야 머지 가능합니다.
- 리뷰 시 코드 품질보다 **동작 여부와 스키마 준수 여부**를 우선 확인합니다. (14일 스프린트이므로)
- 블로커가 아닌 코멘트는 `[nit]`로 표시합니다.

### 머지 방식

- **Squash and Merge**를 기본으로 사용합니다.
- 머지 후 원격 feature 브랜치는 삭제합니다.

---

## 코드 스타일

### Python (ai-pipeline, backend)

- 포매터: `black` (기본 설정)
- 린터: `ruff`
- 타입 힌트를 가능한 범위에서 사용합니다.

```bash
# 커밋 전 실행
black .
ruff check .
```

### TypeScript/JavaScript (frontend)

- 포매터: `prettier`
- 린터: `eslint`

```bash
# 커밋 전 실행
npx prettier --write .
npx eslint .
```

---

## 디렉토리별 담당자

| 디렉토리 | 주 담당 | 부 담당 |
|-----------|---------|---------|
| `ai-pipeline/audio_extractor/` | 신우림 | - |
| `ai-pipeline/rag/` | 신우림 | - |
| `ai-pipeline/gemini/` | 신우림 | 진웨이얀 |
| `backend/` | 진웨이얀 | 민지인 |
| `frontend/` | 정희진 | - |
| `data/` | 신우림 | - |
| `docs/` | 신우림 | 전원 |
| `.github/`, `docker-compose.yml` | 진웨이얀 | - |
| Firebase/GCP 설정 | 민지인 | - |

타 담당 디렉토리를 수정해야 할 경우, 해당 담당자를 반드시 Reviewer로 지정합니다.

---

## 긴급 상황 대응

### dev 브랜치가 깨졌을 때

1. 카톡 단톡방에 즉시 공유
2. 원인 커밋을 `git revert`로 되돌림
3. 수정 후 다시 PR

### 머지 충돌 (Conflict)

1. 본인 feature 브랜치에서 dev를 pull 받아 로컬에서 충돌 해결
2. 해결 후 force push 하지 말고, 충돌 해결 커밋을 추가
3. 해결이 어려우면 카톡으로 해당 파일 담당자에게 요청
