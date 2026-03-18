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
    
    cred_path=os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")

    options = {}
    if bucket_name:
        options["storageBucket"] = bucket_name

    if cred_path:
        # local dev
        cred=credentials.Certificate(cred_path)
        _app=firebase_admin.initialize_app(cred, options)
    else:
        # Cloud Run (ADC)
        _app=firebase_admin.initialize_app(options=options)

    return _app