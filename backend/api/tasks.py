import json
import logging
import sys
from pathlib import Path

from celery import shared_task
from audio_pipeline.pipeline import run_audio_pipeline

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

logger = logging.getLogger(__name__)

video_repo = VideoRepository()
job_repo = JobRepository()
analysis_result_repo = AnalysisResultRepository()

video_service = VideoService(video_repo)
job_service = JobService(job_repo, video_repo)
analysis_result_service = AnalysisResultService(analysis_result_repo)
storage_service = StorageService()


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
    """
    Temporary Celery task for async pipeline testing.

    Current behavior:
    - updates job status
    - runs audio pipeline for YouTube input
    - creates analysis_result metadata
    - writes a temporary result JSON
    - uploads it to Firebase Storage
    - marks job as done

    Later this will be replaced with:
    audio_pipeline -> AI feature extractor -> Gemini -> result.json
    """
    try:
        if not youtube_url:
            raise ValueError("youtube_url is required for current pipeline")

        # 1) queued -> downloading
        job_service.update_status(uid, job_id, "downloading")
        logger.info("Job %s: downloading stage started", job_id)

        # Real audio pipeline connection
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

        # create result metadata in Firestore
        result_meta = analysis_result_service.create_result(
            uid=uid,
            video_id=video_id,
            subtitle_source="gemini",
        )
        result_id = result_meta["resultId"]

        # get resultPath from Firestore
        result_path = analysis_result_service.get_result_path(uid, video_id, result_id)

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
        # Temporary result body using real pipeline output
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
            "base_moods": [],
            "events": [],
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