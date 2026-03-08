import json
from pathlib import Path

from celery import shared_task

from firestore_service.repositories.video_repo import VideoRepository
from firestore_service.repositories.job_repo import JobRepository
from firestore_service.repositories.analysis_result_repo import AnalysisResultRepository

from firestore_service.services.video_service import VideoService
from firestore_service.services.job_service import JobService
from firestore_service.services.analysis_result_service import AnalysisResultService
from firestore_service.services.storage_service import StorageService


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
    - creates analysis_result metadata
    - writes a dummy result JSON
    - uploads it to Firebase Storage
    - marks job as done

    Later this will be replaced with:
    audio_pipeline -> AI feature extractor -> Gemini -> result.json
    """
    try:
        # 1) job: queued -> processing
        job_service.update_status(uid, job_id, "processing")

        # 2) create result metadata in Firestore
        result_meta = analysis_result_service.create_result(
            uid=uid,
            video_id=video_id,
            subtitle_source="gemini",
        )
        result_id = result_meta["resultId"]

        # 3) get resultPath from Firestore
        result_path = analysis_result_service.get_result_path(uid, video_id, result_id)

        # 4) make local temp folder
        job_dir = Path("/tmp/soundsight") / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        local_result_json_path = job_dir / "emotion_timeline.json"

        # 5) create a dummy result body for now
        dummy_result = {
            "schemaVersion": "1.0.0",
            "videoUrl": "",
            "base_moods": [
                {
                    "label": "warmth",
                    "intensity": 0.6,
                    "start": 0.0,
                    "end": 10.0,
                }
            ],
            "events": [
                {
                    "type": "swell",
                    "trigger_time": 5.0,
                    "duration": 2.0,
                    "strength": 0.7,
                }
            ],
        }

        with local_result_json_path.open("w", encoding="utf-8") as f:
            json.dump(dummy_result, f, ensure_ascii=False, indent=2)

        # 6) upload dummy result JSON to Firebase Storage
        storage_service.upload_file_to_storage(
            local_path=str(local_result_json_path),
            dest_path=result_path,
            content_type="application/json",
        )

        # 7) mark job done
        job_service.update_status(uid, job_id, "done")

        return {
            "jobId": job_id,
            "videoId": video_id,
            "resultId": result_id,
            "resultPath": result_path,
        }

    except Exception as e:
        job_service.fail_job(uid, job_id, str(e))
        raise