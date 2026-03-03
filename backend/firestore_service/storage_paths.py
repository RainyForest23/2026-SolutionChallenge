# Firebase Storage Paths

def video_object_path(uid: str, video_id: str, ext: str = "mp4") -> str:
    # videos/{uid}/{videoId}.mp4
    return f"videos/{uid}/{video_id}.{ext}"

def result_object_path(uid: str, video_id: str, result_id: str) -> str:
    # results/{uid}/{videoId}/{resultId}.json
    return f"results/{uid}/{video_id}/{result_id}.json"

def audio_object_path(uid: str, video_id: str, audio_id: str, ext: str = "mp3") -> str:
    # audios/{uid}/{videoId}/{audioId}.mp3
    return f"audios/{uid}/{video_id}/{audio_id}.{ext}"