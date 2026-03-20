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

# ---------------------------------------------------------------------------
# 데모용 URL 매핑 (YouTube bot 차단 우회용 임시 처리)
# ---------------------------------------------------------------------------
DEMO_UID = "bPeecEgbt7R2S95wo8yhZhOyTGz1"
DEMO_YOUTUBE_MAP = {
    "gIHjXDxghqE": "LmZB58uBRpm6WalM0nNz",  # 인터스텔라
    "0iIgjQfSqS4": "MdPp5xetLVGWC9sOd5df",   # 헤어질결심
    "6TH1u3n1UY4": "KWG4tYGYgR8ZSnT5HC6K",  # 리틀포레스트
}

def _get_job_with_demo_fallback(uid: str, job_id: str) -> tuple:
    """job을 uid 네임스페이스에서 먼저 찾고, 없으면 DEMO_UID에서 찾는다.
    Returns (job, effective_uid)"""
    try:
        return get_job_service().get_job(uid, job_id), uid
    except JobNotFoundError:
        pass
    try:
        return get_job_service().get_job(DEMO_UID, job_id), DEMO_UID
    except JobNotFoundError:
        raise


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
        # 데모 URL 체크: Firebase Storage 영상으로 실제 Gemini 분석 실행 (YouTube 차단 우회)
        if youtube_url:
            try:
                yt_vid_id = VideoService(VideoRepository()).extract_youtube_video_id(youtube_url)
                demo_video_id = DEMO_YOUTUBE_MAP.get(yt_vid_id)
                if demo_video_id:
                    # 이미 완료된 결과 있으면 캐시 반환
                    demo_job = get_job_service().get_latest_job_by_video(DEMO_UID, demo_video_id)
                    if demo_job and demo_job.get("status") == "done":
                        resp_data = AnalyzeResponseSerializer(
                            {"job_id": demo_job["jobId"], "video_id": demo_video_id, "status": "done"}
                        ).data
                        return Response(resp_data, status=drf_status.HTTP_202_ACCEPTED)

                    # 이미 진행 중이면 해당 job 반환
                    active_demo_job = get_job_service().get_active_job_by_video(DEMO_UID, demo_video_id)
                    if active_demo_job:
                        resp_data = AnalyzeResponseSerializer(
                            {"job_id": active_demo_job["jobId"], "video_id": demo_video_id, "status": active_demo_job.get("status")}
                        ).data
                        return Response(resp_data, status=drf_status.HTTP_202_ACCEPTED)

                    # Firestore에 video 문서 없으면 생성 (특정 ID로)
                    from firestore_service.firestore_client import get_firestore_client
                    from google.cloud import firestore as _fs
                    db = get_firestore_client()
                    video_ref = db.document(f"users/{DEMO_UID}/videos/{demo_video_id}")
                    if not video_ref.get().exists:
                        video_ref.set({
                            "uid": DEMO_UID,
                            "sourceType": "storage",
                            "currentStatus": "queued",
                            "createdAt": _fs.SERVER_TIMESTAMP,
                            "updatedAt": _fs.SERVER_TIMESTAMP,
                        })

                    # Firebase Storage 영상으로 실제 Gemini 분석 트리거
                    demo_job_id = uuid.uuid4().hex
                    get_job_service().create_job(uid=DEMO_UID, job_id=demo_job_id, video_id=demo_video_id, status="queued")
                    if analyze_video_task:
                        analyze_video_task.delay(
                            uid=DEMO_UID,
                            job_id=demo_job_id,
                            video_id=demo_video_id,
                            upload_id=demo_video_id,
                            youtube_url=youtube_url,
                        )
                    resp_data = AnalyzeResponseSerializer(
                        {"job_id": demo_job_id, "video_id": demo_video_id, "status": "queued"}
                    ).data
                    return Response(resp_data, status=drf_status.HTTP_202_ACCEPTED)
            except Exception:
                pass  # 데모 체크 실패 시 정상 YouTube 흐름으로 진행

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

                # 이미 완료된 결과가 있으면 재분석 없이 바로 반환
                latest_job = get_job_service().get_latest_job_by_video(uid, video_id)
                if latest_job and latest_job.get("status") == "done":
                    resp_data = AnalyzeResponseSerializer(
                        {"job_id": latest_job["jobId"], "video_id": video_id, "status": "done"}
                    ).data
                    return Response(resp_data, status=drf_status.HTTP_202_ACCEPTED)

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
            # upload_id = Firebase Storage에 업로드된 video_id
            if not upload_id:
                return Response(
                    {"detail": "youtube_url 또는 upload_id가 필요합니다."},
                    status=drf_status.HTTP_400_BAD_REQUEST,
                )
            video_id = upload_id

            # video 존재 확인
            try:
                get_video_service().get_video_with_status(uid, video_id)
            except VideoNotFoundError:
                return Response({"detail": "Video not found"}, status=drf_status.HTTP_404_NOT_FOUND)

            # 이미 완료된 결과가 있으면 바로 반환
            latest_job = get_job_service().get_latest_job_by_video(uid, video_id)
            if latest_job and latest_job.get("status") == "done":
                resp_data = AnalyzeResponseSerializer(
                    {"job_id": latest_job["jobId"], "video_id": video_id, "status": "done"}
                ).data
                return Response(resp_data, status=drf_status.HTTP_202_ACCEPTED)

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
        job, _ = _get_job_with_demo_fallback(uid, job_id)

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
                "type": event.get("label"),
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
        job, effective_uid = _get_job_with_demo_fallback(uid, job_id)
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

        latest_result = get_result_service().get_latest_result(effective_uid, video_id)
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