# SDK 초기화: 로컬/Cloud Run 모두 지원
import os
import firebase_admin
from firebase_admin import credentials

_app = None

def get_firebase_app():
    global _app
    # 앱이 있으면 그걸 반환
    if _app:
        return _app
    
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    project_id = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("PROJECT_ID")
        or os.getenv("FIREBASE_PROJECT_ID")
    )

    options = {}
    if bucket_name:
        options["storageBucket"] = bucket_name
    if project_id:
        options["projectId"] = project_id

    if cred_path:
        if not os.path.exists(cred_path):
            raise RuntimeError(
                "GOOGLE_APPLICATION_CREDENTIALS points to a missing file. "
                "Use a local JSON key only in local development, and leave it unset on Cloud Run."
            )
        # local dev
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred, options)
    else:
        # Cloud Run (ADC)
        _app = firebase_admin.initialize_app(options=options)

    return _app
