from typing import Any, Dict, Optional
import uuid
from django.utils import timezone
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as drf_status
from firestore_service.auth import authenticate_request
import logging

from .serializers import (
    AnalyzeRequestSerializer,
    AnalyzeResponseSerializer,
    StatusResponseSerializer,
    ResultResponseSerializer,
)

logger = logging.getLogger(__name__)

# Firestore를 먼저 시도하고, 사용 불가능하면 Django 캐시로 폴백
try:
    from google.cloud import firestore

    _FS_CLIENT = firestore.Client()
except Exception:
    _FS_CLIENT = None

# Celery 작업 시도 (선택사항). backend/api/tasks.py에서 analyze_video_task를 구현해야 함
try:
    from .tasks import analyze_video_task
except Exception:
    analyze_video_task = None

# 현재 시간을 ISO 형식 문자열로 반환
def _now_iso() -> str:
    return timezone.now().isoformat()

# 작업 정보를 Firestore 또는 캐시에 저장
def _save_job(job_id: str, payload: Dict[str, Any]) -> None:
    if _FS_CLIENT:
        # Firestore에 저장
        doc_ref = _FS_CLIENT.collection("jobs").document(job_id)
        doc_ref.set(payload)
    else:
        # 캐시에 저장 (Firestore 없을 때)
        cache.set(f"job:{job_id}", payload, timeout=None)

# 저장된 작업 정보를 조회
def _get_job(job_id: str) -> Optional[Dict[str, Any]]:
    if _FS_CLIENT:
        # Firestore에서 조회
        doc = _FS_CLIENT.collection("jobs").document(job_id).get()
        return doc.to_dict() if doc.exists else None
    # 캐시에서 조회
    return cache.get(f"job:{job_id}")

def _forbidden() -> Response:
    # don’t leak whether the job exists for other users.
    return Response({"error": "Forbidden"}, status=drf_status.HTTP_403_FORBIDDEN)

@api_view(["POST"])
def analyze(request):
    """
    POST /api/analyze
    Starts a new emotion analysis job (queued). Returns 202 Accepted with Location header.
    Requires Firebase auth:
    Authorization: Bearer <ID_TOKEN>
    Body: { "youtube_url": "...", "upload_id": "...", "callback_url": "optional" }
    """
    # Require auth + capture owner uid
    uid, _decoded = authenticate_request(request)

    # 요청 데이터 검증
    serializer = AnalyzeRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)

    # 고유 작업 ID 생성
    job_id = uuid.uuid4().hex
    payload = {
        "job_id": job_id,
        "uid": uid,  # owner of this job
        "status": "queued",  # 초기 상태: 대기 중
        "input": serializer.validated_data,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "error": None,
        "result": None,
    }
    # 작업 정보 저장
    _save_job(job_id, payload)

    # 백그라운드 작업 대기열에 추가 (Celery 작업이 존재하면)
    if analyze_video_task:
        try:
            analyze_video_task.delay(job_id, serializer.validated_data)
        except Exception:
            logger.exception("Failed to enqueue analyze_video_task")
            # 작업 대기열 추가 실패 시 상태를 'failed'로 업데이트
            payload["status"] = "failed"
            payload["error"] = "failed to enqueue task"
            payload["updated_at"] = _now_iso()
            _save_job(job_id, payload)
            return Response({"job_id": job_id, "status": "failed"}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 202 Accepted 응답 반환 (표준 비동기 작업 응답)
    resp = Response({"job_id": job_id, "status": "queued"}, status=drf_status.HTTP_202_ACCEPTED)
    resp["Location"] = f"/api/status?job_id={job_id}"  # 상태 조회 엔드포인트 위치
    return resp

@api_view(["GET"])
def status(request):
    """
    GET /api/status?job_id=...
    Returns current processing status.
        Requires Firebase auth:
      Authorization: Bearer <ID_TOKEN>
    """

    uid, _decoded = authenticate_request(request)

    # 쿼리 파라미터에서 작업 ID 추출
    job_id = request.query_params.get("job_id")
    if not job_id:
        return Response({"error": "Missing required query param: job_id"}, status=drf_status.HTTP_400_BAD_REQUEST)

    # 저장된 작업 정보 조회
    job = _get_job(job_id)
    if not job:
        return Response({"error": "Job not found", "job_id": job_id}, status=drf_status.HTTP_404_NOT_FOUND)

    if job.get("uid") != uid:
        return _forbidden()
    
    # 응답 직렬화 (검증 및 포맷팅)
    resp_ser = StatusResponseSerializer(
        {
            "job_id": job_id,
            "status": job.get("status", "unknown"),  # 상태: queued, processing, done, failed, downloading, uploading
            "error": job.get("error"),  # 오류 메시지 (있으면)
        }
    )
    return Response(resp_ser.data, status=drf_status.HTTP_200_OK)

@api_view(["GET"])
def result(request):
    """
    GET /api/result?job_id=...
    Returns the final emotion analysis result when ready.
    Requires Firebase auth:
      Authorization: Bearer <ID_TOKEN>
    """
    uid, _decoded = authenticate_request(request)

    # 쿼리 파라미터에서 작업 ID 추출
    job_id = request.query_params.get("job_id")
    if not job_id:
        return Response({"error": "Missing required query param: job_id"}, status=drf_status.HTTP_400_BAD_REQUEST)

    # 저장된 작업 정보 조회
    job = _get_job(job_id)
    if not job:
        return Response({"error": "Job not found", "job_id": job_id}, status=drf_status.HTTP_404_NOT_FOUND)
    
    # Owner-only access check
    if job.get("uid") != uid:
        return _forbidden()

    # 작업 상태 확인
    status_val = job.get("status")
    if status_val != "done":
        # 결과가 아직 준비되지 않음 (202 Accepted = 계속 기다려야 함)
        return Response({"job_id": job_id, "status": status_val, "message": "Result not ready yet."}, status=drf_status.HTTP_202_ACCEPTED)

    # 작업 완료: 최종 결과 반환
    resp_ser = ResultResponseSerializer(
        {
            "job_id": job_id,
            "status": "done",
            "result": job.get("result", {}),  # 감정 타임라인 데이터
        }
    )
    return Response(resp_ser.data, status=drf_status.HTTP_200_OK)

# Auth 연동 확인 엔드포인트
@api_view(["GET"])
def me(request):
    uid, decoded = authenticate_request(request)

    return Response({
        "uid": uid,
        "email": decoded.get("email"),
    })