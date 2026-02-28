# ---- Collection Names ----

USERS = "users"
VIDEOS = "videos"
JOBS = "jobs"
ANALYSIS_RESULTS = "analysis_results"
FEEDBACK = "feedbacks"

# ---- Path Builders ----

# 사용자 문서 저장하는 경로
def user_doc(uid: str) -> str:
    return f"{USERS}/{uid}"


# 비디오 저장 경로 (firestore X, storage에 저장)
def video_storage_path(uid: str, video_id: str) -> str:
    return f"videos/{uid}/{video_id}.mp4"

# 비디오 문서 저장하는 경로
def video_doc(uid: str, video_id: str) -> str:
    return f"{USERS}/{uid}/{VIDEOS}/{video_id}"

# 비디오 문서 저장을 위해 가져오는 컬렉션 경로
def videos_collection(uid: str) -> str:
    return f"{USERS}/{uid}/{VIDEOS}"


# job 문서 저장하는 경로
def job_doc(uid: str, job_id: str) -> str:
    return f"{USERS}/{uid}/{JOBS}/{job_id}"

# job 문서 저장을 위해 가져오는 컬렉션 경로
def jobs_collection(uid: str) -> str:
    return f"{USERS}/{uid}/{JOBS}"


# 분석 결과 저장 경로 (firestore X, storage에 저장)
def analysis_result_storage_path(uid: str, video_id: str, result_id: str) -> str:
    return f"results/{uid}/{video_id}/{result_id}.json"

# 분석 결과 경로 문서 저장하는 경로
def analysis_result_doc(uid: str, video_id: str, result_id: str) -> str:
    return f"{USERS}/{uid}/{VIDEOS}/{video_id}/{ANALYSIS_RESULTS}/{result_id}"

# 분석 결과 경로 문서 저장을 위해 가져오는 컬렉션 경로
def analysis_results_collection(uid: str, video_id: str) -> str:
    return f"{USERS}/{uid}/{VIDEOS}/{video_id}/{ANALYSIS_RESULTS}"


# 피드백 문서 저장하는 경로
def feedback_doc(uid: str, video_id: str, feedback_id: str) -> str:
    return f"{USERS}/{uid}/{VIDEOS}/{video_id}/{FEEDBACK}/{feedback_id}"

# 피드백 문서 저장을 위해 가져오는 컬렉션 경로
def feedbacks_collection(uid: str, video_id: str) -> str:
    return f"{USERS}/{uid}/{VIDEOS}/{video_id}/{FEEDBACK}"