import json
import logging
import sys
from pathlib import Path

from celery import shared_task
from audio_pipeline.pipeline import run_audio_pipeline, run_audio_pipeline_from_file

from firestore_service.repositories.video_repo import VideoRepository
from firestore_service.repositories.job_repo import JobRepository
from firestore_service.repositories.analysis_result_repo import AnalysisResultRepository

from firestore_service.services.video_service import VideoService
from firestore_service.services.job_service import JobService
from firestore_service.services.analysis_result_service import AnalysisResultService
from firestore_service.services.storage_service import StorageService

# add ai-pipeline folder to Python path
sys.path.append(str(Path(__file__).resolve().parents[1] / "ai-pipeline"))

from audio_extractor.pipeline import AudioFeatureExtractor
from .gemini_adapter import call_gemini_timeline

logger = logging.getLogger(__name__)

video_repo = VideoRepository()
job_repo = JobRepository()
analysis_result_repo = AnalysisResultRepository()

video_service = VideoService(video_repo)
job_service = JobService(job_repo, video_repo)
analysis_result_service = AnalysisResultService(analysis_result_repo)
storage_service = StorageService()

def convert_audio_features_to_result(video_url: str, audio_features: dict):
    base_moods = []
    events = []

    segments = audio_features.get("segments", [])

    for seg in segments:
        start = seg["start_time_sec"]
        end = seg["end_time_sec"]
        feats = seg["features"]

        energy = feats.get("mean_energy", 0)
        tempo = feats.get("tempo_bpm", 0)
        event_count = feats.get("event_count", 0)

        if energy >= 0.12:
            label = "tension"
            intensity = min(1.0, round(energy * 4, 2))

        elif tempo >= 125:
            label = "uplift"
            intensity = 0.65

        elif energy <= 0.02:
            label = "sorrow"
            intensity = 0.35

        else:
            label = "warmth"
            intensity = 0.45

        base_moods.append(
            {
                "label": label,
                "intensity": intensity,
                "start": start,
                "end": end,
            }
        )

        # ---- event rule ----
        if event_count >= 50:
            events.append(
                {
                    "type": "swell",
                    "trigger_time": start,
                    "duration": end - start,
                    "strength": min(1.0, round(event_count / 80, 2)),
                }
            )

        elif energy <= 0.01 and event_count <= 3:
            events.append(
                {
                    "type": "sudden_drop",
                    "trigger_time": start,
                    "duration": end - start,
                    "strength": 0.5,
                }
            )

    return {
        "videoUrl": video_url,
        "base_moods": base_moods,
        "events": events,
    }

def normalize_gemini_timeline(video_url: str, gemini_timeline: list[dict]) -> dict:
    base_moods = []
    events = []

    for item in gemini_timeline:
        start = float(item.get("start_time", 0.0))
        end = float(item.get("end_time", 0.0))
        base_mood = item.get("base_mood", "unknown")
        dynamic_event = item.get("dynamic_event", "stable")
        intensity = float(item.get("intensity", 0.5))

        base_moods.append(
            {
                "label": base_mood,
                "intensity": max(0.0, min(1.0, intensity)),
                "start": start,
                "end": end,
            }
        )

        if dynamic_event != "stable":
            events.append(
                {
                    "type": dynamic_event,
                    "trigger_time": start,
                    "duration": round(end - start, 2),
                    "strength": max(0.0, min(1.0, intensity)),
                }
            )

    return {
        "videoUrl": video_url,
        "base_moods": base_moods,
        "events": events,
    }

@shared_task(bind=True)
def analyze_video_task(
    self,
    *,
    uid: str,
    job_id: str,
    video_id: str,
    youtube_url: str = None,
    upload_id: str = None,
    callback_url: str = None,
):
    try:
        if not youtube_url and not upload_id:
            raise ValueError("youtube_url or upload_id is required")

        # 1) queued -> downloading
        job_service.update_status(uid, job_id, "downloading")
        logger.info("Job %s: downloading stage started", job_id)

        if upload_id:
            # Firebase Storage에서 다운로드 후 파이프라인 실행
            from firestore_service.storage_paths import video_object_path
            storage_path = video_object_path(uid, upload_id)
            local_video_path = f"/tmp/soundsight/{job_id}/source.mp4"
            storage_service.download_file(storage_path, local_video_path)
            pipeline_output = run_audio_pipeline_from_file(
                audio_file_path=local_video_path,
                workdir="/tmp/soundsight",
                job_id=job_id,
                segment_sec=10,
            )
        else:
            # YouTube URL에서 다운로드
            pipeline_output = run_audio_pipeline(
                youtube_url=youtube_url,
                workdir="/tmp/soundsight",
                job_id=job_id,
                segment_sec=10,
            )

        logger.info("Job %s: audio pipeline finished: %s", job_id, pipeline_output)

        # 2) downloading -> uploading
        job_service.update_status(uid, job_id, "uploading")
        logger.info("Job %s: uploading stage started", job_id)

        # make local temp folder
        job_dir = Path("/tmp/soundsight") / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        local_result_json_path = job_dir / "emotion_timeline.json"

        wav_path = pipeline_output["wav_path"]
        extractor = AudioFeatureExtractor(segment_duration=10.0, sr=22050)
        audio_features_json_str = extractor.process(
            input_path=wav_path,
            output_json_path=str(job_dir / "audio_features.json"),
        )
        audio_features = json.loads(audio_features_json_str)

        try:
            gemini_timeline = call_gemini_timeline(audio_features=audio_features)
            result_payload = normalize_gemini_timeline(
                video_url=youtube_url,
                gemini_timeline=gemini_timeline,
            )
            subtitle_source = "gemini"
        except Exception:
            logger.exception("Gemini failed, fallback to rule-based conversion")
            result_payload = convert_audio_features_to_result(
                video_url=youtube_url,
                audio_features=audio_features,
            )
            subtitle_source = "rule-based"

                # create result metadata in Firestore
        result_meta = analysis_result_service.create_result(
            uid=uid,
            video_id=video_id,
            subtitle_source=subtitle_source,
        )
        result_id = result_meta["resultId"]
        # get resultPath from Firestore
        result_path = analysis_result_service.get_result_path(uid, video_id, result_id)

        result_body = {
            "schemaVersion": "1.0.0",
            "videoUrl": youtube_url,
            "pipeline": {
                "audio_path": pipeline_output.get("audio_path"),
                "wav_path": wav_path,
                "segments_dir": pipeline_output.get("segments_dir"),
                "segment_paths": pipeline_output.get("segment_paths", []),
                "duration_sec": pipeline_output.get("duration_sec"),
            },
            "audio_features": audio_features,
            "base_moods": result_payload["base_moods"],
            "events": result_payload["events"],
        }

        with local_result_json_path.open("w", encoding="utf-8") as f:
            json.dump(result_body, f, ensure_ascii=False, indent=2)

        storage_service.upload_file_to_storage(
            local_path=str(local_result_json_path),
            dest_path=result_path,
            content_type="application/json",
        )

        logger.info("Job %s: result uploaded to %s", job_id, result_path)

        # 3) uploading -> processing
        job_service.update_status(uid, job_id, "processing")
        logger.info("Job %s: processing stage completed", job_id)

        # 4) processing -> done
        job_service.update_status(uid, job_id, "done")
        logger.info("Job %s: done", job_id)

        return {
            "jobId": job_id,
            "videoId": video_id,
            "resultId": result_id,
            "resultPath": result_path,
            "pipelineOutput": pipeline_output,
        }

    except Exception as e:
        logger.exception("Job %s failed", job_id)
        job_service.fail_job(uid, job_id, str(e))
        raise