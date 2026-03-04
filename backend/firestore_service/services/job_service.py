from typing import Any, Dict, List, Optional

class NotFoundError(Exception):
    pass

class BadRequestError(Exception):
    pass

VALID_STATUSES = {"queued", "downloading", "uploading", "processing", "done", "failed"}

# 앞으로 가는 전이만 허용 (failed는 별도 처리)
ALLOWED_NEXT = {
    "queued": {"downloading", "failed"},
    "downloading": {"uploading", "failed"},
    "uploading": {"processing", "failed"},
    "processing": {"done", "failed"},
    "done": set(),
    "failed": set(),
}

class JobService:
    def __init__(self, job_repo, video_repo):
        self.job_repo = job_repo
        self.video_repo = video_repo


    # job_id는 views.py에서 생성
    def create_job(self, uid: str, job_id: str, video_id: str, status: str = "queued") -> Dict[str, Any]:
        if status not in VALID_STATUSES:
            raise BadRequestError(f"Invalid status: {status}")

        data = {
            "videoId": video_id,
            "status": status,
            "error": None,   # 스키마 상 필수
        }

        self.job_repo.create_job(uid, job_id, data) 
        return {"jobId": job_id, **data}


    def get_job(self, uid: str, job_id: str) -> Dict[str, Any]:
        job = self.job_repo.get_job(uid, job_id)
        if job is None:
            raise NotFoundError("Job not Found")
        return job


    def list_jobs(self, uid: str, limit: int = 50) -> List[Dict[str, Any]]:
        return self.job_repo.list_jobs(uid, limit=limit)


    def get_latest_job_by_video(self, uid: str, video_id: str) -> Optional[Dict[str, Any]]:
        return self.job_repo.get_latest_job_by_video(uid, video_id)


    def get_active_job_by_video(self, uid: str, video_id: str) -> Optional[Dict[str, Any]]:
        return self.job_repo.get_active_job_by_video(uid, video_id)


    def update_status(self, uid: str, job_id: str, new_status: str, error: Optional[str] = None) -> Dict[str, Any]:
        """
        - failed면 error 필수 권장
        - done이면 error는 None으로 정리
        """
        if new_status not in VALID_STATUSES:
            raise BadRequestError(f"Invalid status: {new_status}")

        job = self.get_job(uid, job_id)
        current_status = job.get("status")
        
        # 현재 상태가 없거나 이상하면 방어
        if current_status not in VALID_STATUSES:
            raise BadRequestError(f"Corrupted job status: {current_status}")

        # 동일 상태로의 업데이트는 허용
        if new_status == current_status:
            # error만 바꾸는 케이스 허용
            if error is not None:
                self.job_repo.update_job(uid, job_id, {"error": error})
                job["error"] = error
            return job

        # failed는 어디서든 가능, 그 외는 전이표로 제한
        if new_status != "failed" and new_status not in ALLOWED_NEXT[current_status]:
            raise BadRequestError(f"Invalid transition: {current_status} -> {new_status}")

        patch: Dict[str, Any] = {"status": new_status}

        if new_status == "failed":
            # 실패면 error를 남기는 게 필수
            patch["error"] = error or "Unknown error"
        elif new_status == "done":
            patch["error"] = None
        else:
            # 진행중 상태로 가면 기존 에러는 보통 제거
            patch["error"] = None if error is None else error

        self.job_repo.update_job(uid, job_id, patch)
        # 반환용으로 job dict 갱신
        job.update(patch)
        # video currentStatus 동기화
        video_id = job.get("videoId")
        if video_id:
            video_status = self.video_repo.get_video("currentStatus")

            # 앞으로 가는 전이만 허용, 뒤로 가는 업데이트는 무시
            if new_status == "failed" or new_status in ALLOWED_NEXT.get(video_status, set()):
                self.video_repo.update_latest_status(uid, video_id, new_status)
            
        return job


    def fail_job(self, uid: str, job_id: str, error: str) -> Dict[str, Any]:
        return self.update_status(uid, job_id, "failed", error=error)


    def delete_job(self, uid: str, job_id: str) -> None:
        self.get_job(uid, job_id) # 존재 확인
        self.job_repo.delete_job(uid, job_id)