import json
import logging
import uuid

from django.http import Http404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as drf_status
from rest_framework.exceptions import ValidationError, NotAuthenticated

from firestore_service.repositories.user_repo import UserRepository
from firestore_service.repositories.video_repo import VideoRepository
from firestore_service.repositories.job_repo import JobRepository
from firestore_service.repositories.analysis_result_repo import AnalysisResultRepository
from firestore_service.services.user_service import UserService
from firestore_service.services.video_service import VideoService, BadRequestError as VideoBadRequestError, ConflictError as VideoConflictError, NotFoundError as VideoNotFoundError
from firestore_service.services.job_service import JobService, BadRequestError as JobBadRequestError, NotFoundError as JobNotFoundError
from firestore_service.services.analysis_result_service import AnalysisResultService, BadRequestError as ResultBadRequestError, NotFoundError as ResultNotFoundError
from firestore_service.services.storage_service import StorageService, BadRequestError as StorageBadRequestError, StorageUploadError, StorageReadError

from .serializers import (
    AnalyzeRequestSerializer,
    AnalyzeResponseSerializer,
    StatusResponseSerializer,
    ResultResponseSerializer,
)

logger = logging.getLogger(__name__)

try:
    from .tasks import analyze_video_task
except Exception:
    analyze_video_task = None


def get_user_service():
    return UserService(UserRepository())

def get_video_service():
    return VideoService(VideoRepository())

def get_job_service():
    return JobService(JobRepository(), VideoRepository())

def get_result_service():
    return AnalysisResultService(AnalysisResultRepository())

def get_storage_service():
    return StorageService()

def _forbidden() -> Response:
    return Response({"detail": "Forbidden"}, status=drf_status.HTTP_403_FORBIDDEN)

def _handle_service_error(exc: Exception) -> Response:
    if isinstance(exc, (VideoBadRequestError, JobBadRequestError, ResultBadRequestError, StorageBadRequestError)):
        detail = exc.args[0] if exc.args else "Bad request"
        if isinstance(detail, dict):
            raise ValidationError(detail)
        return Response({"detail": detail}, status=drf_status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, VideoConflictError):
        return Response({"detail": str(exc)}, status=drf_status.HTTP_409_CONFLICT)

    if isinstance(exc, (VideoNotFoundError, JobNotFoundError, ResultNotFoundError)):
        raise Http404(str(exc))

    logger.exception("Unhandled service error")
    return Response({"detail": "Internal server error"}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
def analyze(request):
    """
    POST /api/analyze
    Create video + create job + enqueue background pipeline.
    Owner-only API.
    """
    uid = request.user.uid
    decoded = request.auth

    # create/update users/{uid}
    try:
        get_user_service().upsert_user_from_decoded(decoded)
    except Exception:
        logger.exception("Failed to upsert user from decoded token")

    serializer = AnalyzeRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    youtube_url = data.get("youtube_url")
    upload_id = data.get("upload_id")
    callback_url = data.get("callback_url")
    title = data.get("title") or "Untitled Video"

    try:
        # current architecture is video-first, then job
        if youtube_url:
            existing_video = get_video_service().get_video_by_youtube_url(uid, youtube_url)

            if existing_video:
                video_id = existing_video["videoId"]

                active_job = get_job_service().get_active_job_by_video(uid, video_id)
                if active_job:
                    return Response(
                        {
                            "detail": f"이미 처리 중인 작업이 있습니다. jobId={active_job.get('jobId')}"
                        },
                        status=drf_status.HTTP_409_CONFLICT,
                    )

                # if latest_job is failed or done, allow new job creation
                # if latest_job is None, also allow
            else:
                video = get_video_service().create_video(
                    uid=uid,
                    title=title,
                    youtube_url=youtube_url,
                    duration_sec=None,
                )
                video_id = video["videoId"]
        else:
            # upload_id flow is not fully designed in current service layer yet
            return Response(
                {"detail": "upload_id flow is not implemented yet in current service layer."},
                status=drf_status.HTTP_501_NOT_IMPLEMENTED,
            )

        job_id = uuid.uuid4().hex
        get_job_service().create_job(uid=uid, job_id=job_id, video_id=video_id, status="queued")

        if analyze_video_task:
            try:
                analyze_video_task.delay(
                    uid=uid,
                    job_id=job_id,
                    video_id=video_id,
                    youtube_url=youtube_url,
                    upload_id=upload_id,
                    callback_url=callback_url,
                )
            except Exception:
                logger.exception("Failed to enqueue analyze_video_task")
                get_job_service().fail_job(uid, job_id, "failed to enqueue task")
                return Response(
                    {"job_id": job_id, "video_id": video_id, "status": "failed"},
                    status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        resp_data = AnalyzeResponseSerializer(
            {
                "job_id": job_id,
                "video_id": video_id,
                "status": "queued",
            }
        ).data

        resp = Response(resp_data, status=drf_status.HTTP_202_ACCEPTED)
        resp["Location"] = f"/api/status?job_id={job_id}"
        return resp

    except Exception as exc:
        return _handle_service_error(exc)

@api_view(["GET"])
def status(request):
    """
    GET /api/status?job_id=...
    Returns current processing status for the owner's job.
    """
    uid = request.user.uid
    decoded = request.auth

    job_id = request.query_params.get("job_id")
    if not job_id:
        return Response(
            {"detail": "Missing required query param: job_id"},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    try:
        job = get_job_service().get_job(uid, job_id)

        resp_data = StatusResponseSerializer(
            {
                "job_id": job_id,
                "video_id": job.get("videoId"),
                "status": job.get("status", "unknown"),
                "error": job.get("error"),
            }
        ).data
        return Response(resp_data, status=drf_status.HTTP_200_OK)

    except Exception as exc:
        return _handle_service_error(exc)

def _normalize_result_body(result_body: dict) -> dict:
    """
    Convert stored pipeline JSON into the API response shape:
    {
        "videoUrl": str,
        "base_moods": list,
        "events": list,
    }
    """
    if not isinstance(result_body, dict):
        return {
            "videoUrl": "",
            "base_moods": [],
            "events": [],
        }

    # already in desired shape
    if (
        "videoUrl" in result_body
        and "base_moods" in result_body
        and "events" in result_body
    ):
        return {
            "videoUrl": result_body.get("videoUrl", ""),
            "base_moods": result_body.get("base_moods", []) or [],
            "events": result_body.get("events", []) or [],
        }

    # fallback: old structure
    video_url = result_body.get("videoUrl", "")
    timeline = result_body.get("timeline", []) or []

    base_moods = []
    events = []

    for item in timeline:
        if not isinstance(item, dict):
            continue

        base = item.get("base_mood")
        if isinstance(base, dict):
            base_moods.append({
                "start": item.get("t_start"),
                "end": item.get("t_end"),
                "label": base.get("label"),
                "intensity": base.get("intensity"),
            })

        event = item.get("dynamic_event")
        if isinstance(event, dict):
            events.append({
                "label": event.get("label"),
                "trigger_time": event.get("trigger_time"),
                "duration": event.get("duration"),
                "strength": event.get("strength"),
            })

    return {
        "videoUrl": video_url,
        "base_moods": base_moods,
        "events": events,
    }

@api_view(["GET"])
def result(request):
    """
    GET /api/result?job_id=...
    Returns final analysis result when ready.
    Result body is expected to come from result JSON in Storage,
    while Firestore stores only the metadata/path.
    """
    uid = request.user.uid
    decoded = request.auth

    job_id = request.query_params.get("job_id")
    if not job_id:
        return Response(
            {"detail": "Missing required query param: job_id"},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    try:
        job = get_job_service().get_job(uid, job_id)
        status_val = job.get("status")
        video_id = job.get("videoId")

        if status_val != "done":
            return Response(
                {
                    "job_id": job_id,
                    "video_id": video_id,
                    "status": status_val,
                    "message": "Result not ready yet.",
                },
                status=drf_status.HTTP_202_ACCEPTED,
            )

        latest_result = get_result_service().get_latest_result(uid, video_id)
        if not latest_result:
            raise Http404("Analysis result not found")

        # Firestore stores only resultPath, not the actual timeline JSON body.
        # For now, if pipeline saved parsed result in Firestore-compatible field, use it.
        # Later this should download/read the JSON file from Firebase Storage.
        result_path = latest_result.get("resultPath")
        if not result_path:
            raise Http404("Result path not found")
        
        # 결과 json 파일
        result_body = get_storage_service().read_json(result_path)
        result_body = _normalize_result_body(result_body)

        resp_data = ResultResponseSerializer(
            {
                "job_id": job_id,
                "video_id": video_id,
                "status": "done",
                "result": result_body,
            }
        ).data

        return Response(resp_data, status=drf_status.HTTP_200_OK)

    except Exception as exc:
        return _handle_service_error(exc)

# Auth 연동 확인 엔드포인트
@api_view(["GET"])
def me(request):
    uid = request.user.uid
    decoded = request.auth

    return Response({
        "uid": uid,
        "email": decoded.get("email"),
    })