# Audio Extraction Pipeline

## 개요

이 파이프라인은 YouTube 영상 URL을 입력받아  
AI 감정 분석을 위해 사용할 **오디오 segment**를 생성합니다.

전체 처리 흐름:

YouTube URL  
↓  
yt-dlp (오디오 다운로드)  
↓  
ffmpeg (wav 변환)  
↓  
ffmpeg (segment 분할)  
↓  
AI 파이프라인 분석 (다음 단계)

---

## 폴더 구조

```

backend/audio_pipeline/

youtube.py
→ yt-dlp를 사용하여 YouTube 오디오 다운로드

ffmpeg_utils.py
→ 오디오를 wav로 변환하고 segment로 분할

pipeline.py
→ 전체 오디오 처리 파이프라인 orchestration

utils.py
→ shell command 실행 유틸 함수

exceptions.py
→ 커스텀 예외 처리

```

---

## 파이프라인 동작 과정

* YouTube URL 입력  
* yt-dlp를 사용하여 오디오 다운로드  
* ffmpeg로 오디오를 **16kHz mono wav**로 변환  
* wav 파일을 **10초 단위 segment**로 분할  
* AI 파이프라인에서 각 segment 분석

---

## 생성되는 파일 구조

파이프라인 실행 후 다음과 같은 구조로 파일이 생성됩니다.

```

/tmp/soundsight/{job_id}

audio.m4a
audio.wav

segments/
seg_000.wav
seg_001.wav
seg_002.wav
...

```

### 파일 설명

| 파일 | 설명 |
|-----|-----|
| audio.m4a | yt-dlp로 다운로드된 원본 오디오 |
| audio.wav | AI 분석을 위해 변환된 wav 파일 |
| segments | 일정 길이로 분할된 wav 파일들 |

---

## CLI 테스트 방법

### 로컬 환경에서 실행

```

python -m backend.audio_pipeline.pipeline
--url "https://www.youtube.com/watch?v=VIDEO_ID"
--job-id "test_job"
--workdir "/tmp/soundsight"

```

예시
```
python -m backend.audio_pipeline.pipeline 
--url "https://www.youtube.com/watch?v=gIHjXDxghqE"
--job-id "test_interstellar"
--workdir "/tmp/soundsight"
```

---

### Docker 환경에서 실행

```

docker compose exec backend python -m audio_pipeline.pipeline 
--url "https://www.youtube.com/watch?v=VIDEO_ID"
--job-id "test_job" 
--workdir "/tmp/soundsight"

```

예시

```

docker compose exec backend python -m audio_pipeline.pipeline 
--url "https://www.youtube.com/watch?v=gIHjXDxghqE"
--job-id "test_interstellar"
--workdir "/tmp/soundsight"

```

---

## 테스트 결과 확인

생성된 파일 확인


```
로컬
ls -R /tmp/soundsight/test_job
도커
docker compose exec backend ls -R /tmp/soundsight/test_job

```

예시 출력

```
audio.m4a
audio.wav

segments/
seg_000.wav
seg_001.wav
seg_002.wav
...

```

---

## 필요한 시스템 의존성

- ffmpeg
- yt-dlp

---

## 다음 단계 (Celery 연동)

다음 단계에서는 이 오디오 파이프라인을 **Celery task**와 연결

예상 API 흐름

```

POST /api/analyze
↓
Celery task 실행
↓
run_audio_pipeline()
↓
AI 분석 파이프라인 실행
↓
감정 타임라인 JSON 생성
↓
Firebase Storage / Firestore 저장

```

---
## 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|--------|
| v1.0 | 2026-03-05 | 오디오 추출 파이프라인 구현 |
---
