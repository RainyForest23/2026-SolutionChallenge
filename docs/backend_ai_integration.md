# Backend ↔ AI 파이프라인 연동 문서

이 문서는 Backend와 AI 파이프라인이 어떻게 연결되어 감정 타임라인을 생성하는지 설명합니다.

본 시스템은 다음 컴포넌트들을 연결합니다.

- Backend (Django + Celery)
- Audio processing pipeline
- AI audio feature extraction
- Gemini 기반 감정 타임라인 생성
- Firebase Storage 결과 저장

---

# 1. 전체 파이프라인 흐름

영상 입력부터 감정 타임라인 생성까지의 전체 흐름은 다음과 같습니다.

```

YouTube URL
↓
audio_pipeline (영상 다운로드 + 오디오 추출)
↓
AudioFeatureExtractor (AI)
↓
audio_features.json 생성
↓
Gemini 감정 타임라인 생성
↓
Backend 스키마로 변환
↓
emotion_timeline.json 생성
↓
Firebase Storage 업로드
↓
GET /api/result

```

전체 파이프라인은 **Celery 비동기 task**로 실행됩니다.

---

# 2. Backend 진입 지점

Backend에서 AI 파이프라인이 시작되는 위치는 다음 파일입니다.

```

backend/api/tasks.py

```

핵심 Celery task:

```

analyze_video_task()

```

이 task는 다음 역할을 수행합니다.

1. audio pipeline 실행
2. AI audio feature extraction 수행
3. Gemini 감정 분석 호출
4. 결과를 backend API schema로 변환
5. JSON 파일 생성
6. Firebase Storage 업로드
7. 작업 상태 업데이트

---

# 3. Audio Processing Pipeline

Backend는 다음 함수를 통해 오디오 파이프라인을 실행합니다.

```

run_audio_pipeline()

```

입력:

```

youtube_url

```

출력 예시:

```

{
"audio_path": "...",
"wav_path": "...",
"segments_dir": "...",
"segment_paths": [...],
"duration_sec": 297
}

```

이 단계에서 분석에 사용할 `.wav` 파일이 생성됩니다.

---

# 4. AI Audio Feature Extraction

오디오 feature 추출은 AI의 모듈을 사용합니다.

```

ai-pipeline/audio_extractor/pipeline.py

```

Backend에서 사용하는 함수:

```

AudioFeatureExtractor.process()

```

출력 파일:

```

audio_features.json

```

예시 구조:

```

{
"segments": [
{
"start_time_sec": 0.0,
"end_time_sec": 10.0,
"features": {
"mean_energy": ...,
"tempo_bpm": ...,
"event_count": ...
}
}
]
}

```

이 데이터는 이후 감정 분석 단계에서 사용됩니다.

---

# 5. Gemini 감정 타임라인 생성

Gemini 호출은 다음 adapter를 통해 이루어집니다.

```

backend/api/gemini_adapter.py

```

핵심 함수:

```

call_gemini_timeline(audio_features)

```

이 함수는 다음 과정을 수행합니다.

1. Vertex AI 초기화
2. Gemini 모델 호출
3. 응답 텍스트 정리
4. JSON 파싱

Gemini가 반환해야 하는 구조:

```

[
{
"start_time": 0.0,
"end_time": 15.5,
"base_mood": "warmth",
"dynamic_event": "stable",
"intensity": 0.6,
"shift": false,
"reason": "..."
}
]

```

---

# 6. Backend Schema 변환

Gemini 결과는 Backend API 스키마로 변환됩니다.

사용 함수:

```

normalize_gemini_timeline()

```

Backend 결과 구조:

```

result
├── videoUrl
├── base_moods
└── events

```

예시:

```

{
"videoUrl": "...",
"base_moods": [
{
"label": "tension",
"intensity": 0.75,
"start": 0,
"end": 10
}
],
"events": [
{
"type": "swell",
"trigger_time": 4.2,
"duration": 2.5,
"strength": 0.6
}
]
}

```

---

# 7. Fallback 처리

Gemini 응답이 다음 문제를 일으킬 수 있습니다.

- JSON 형식 오류
- 응답 truncation
- Vertex AI 오류

이 경우 backend는 자동으로 rule-based 방식으로 변환합니다.

```

Gemini 실패
→ convert_audio_features_to_result() 실행

```

이를 통해 파이프라인 전체가 실패하지 않도록 합니다.

---

# 8. 결과 저장

최종 결과는 다음 파일로 저장됩니다.

```

emotion_timeline.json

```

임시 저장 위치:

```

/tmp/soundsight/<job_id>/

```

이 파일은 이후 **Firebase Storage**로 업로드됩니다.

메타데이터는 **Firestore**에 저장됩니다.

---

# 9. API 조회

클라이언트는 다음 API로 결과를 조회합니다.

```

GET /api/result

```

응답 예시:

```

{
"job_id": "...",
"video_id": "...",
"status": "done",
"result": {
"videoUrl": "...",
"base_moods": [...],
"events": [...]
}
}

```

---

# 10. 주요 연동 파일

Backend:

```

backend/api/tasks.py
backend/api/gemini_adapter.py

```

AI pipeline:

```

ai-pipeline/audio_extractor/pipeline.py
ai-pipeline/test_gemini_prompt.py

```

---