# 개발 환경 — Docker 사용 가이드

## 전제 조건
* Docker 및 Docker Compose가 설치되어 있어야 합니다.
* 프로젝트 루트에 위치해야 합니다.

## 프로젝트 파일 요약
* `backend/Dockerfile` — 백엔드(및 Celery 작업자) 이미지 빌드
* `backend/entrypoint.sh` — 컨테이너 시작 시 마이그레이션 등 초기화 수행
* `backend/.dockerignore` — 이미지 빌드 시 제외할 파일 목록
* `docker-compose.yml` — `backend`, `redis`, `celery` 서비스 정의
* `docker-compose.override.yml` — 개발 전용 오버라이드(runserver)
* `backend/.env` — 로컬 환경 변수 파일 (`.env.example`에서 복사)

## 1. 환경 파일 복사 및 수정:
```bash
cp backend/.env.example backend/.env
# backend/.env에 필요한 값(예: FIREBASE_PROJECT_ID, GEMINI_API_KEY 등)을 채우세요.
```
---

## 2. 실행 방법

프로젝트 루트 디렉토리에서 실행:

```bash
docker compose up --build
```

컨테이너 종료:

```bash
docker compose down
```

볼륨까지 완전히 삭제 (초기화):

```bash
docker compose down -v
```
---

## 3. 개발 모드 설명

`docker-compose.override.yml` 파일을 통해 개발 환경 설정을 오버라이드합니다.

```yaml
services:
  backend:
    command: python manage.py runserver 0.0.0.0:8080
```

이 설정을 통해:

* 코드 변경 시 자동 리로드
* 디버깅에 유리한 로그 출력
* 개발 친화적인 서버 환경

프로덕션 환경에서는 Gunicorn이 사용됩니다.
---

## 4. 서비스 접속 정보

### Backend API

```
http://localhost:8080
```

### Redis

```
localhost:6379
```
---

## 5. 내부 동작 방식

### Backend 컨테이너

* `entrypoint.sh` 실행
* 마이그레이션 자동 수행
* Django 서버 시작 (포트 8080)

### Celery 컨테이너

* backend와 동일한 이미지 사용
* Celery 워커 실행:

  ```
  celery -A config worker -l info
  ```

### Redis 컨테이너

* Celery의 메시지 브로커 역할 수행

---

## 10. 참고 사항

* Docker를 사용하는 경우 `.venv`는 필요하지 않습니다.
* 모든 Python 패키지는 컨테이너 내부에 설치됩니다.
* Docker 실행 중에는 로컬 `runserver`를 실행하지 않습니다.
* 팀원 간 동일한 개발 환경을 유지하기 위해 Docker 사용을 권장합니다.
* 패키지 추가 시 `backend/requirements.txt`를 갱신(`pip freeze > backend/requirements.txt`)하고 커밋하세요.

