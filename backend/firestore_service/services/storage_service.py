# Firebase Storage 영상/오디오 파일 업로드
import json
from typing import Optional, Dict, Any
from firebase_admin import storage
from ..storage_paths import video_object_path
import os
from ..firebase_app import get_firebase_app

class StorageUploadError(Exception):
    pass

class BadRequestError(Exception):
    pass

class StorageReadError(Exception):
    pass

class StorageService:

    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name

    def _get_bucket(self, bucket_name: Optional[str] = None):
        get_firebase_app()
        resolved_bucket_name = bucket_name or self.bucket_name
        if resolved_bucket_name:
            return storage.bucket(resolved_bucket_name)
        return storage.bucket()

    def upload_file_to_storage(
        self,
        *,
        local_path: str,
        dest_path: str,
        content_type: Optional[str] = None,
        bucket_name: Optional[str] = None,
    ) -> str:
        """
        Firebase Storage로 업로드하고 dest_path(=storagePath)를 반환.
        전제: 동영상을 다운로드하여 로컬 파일에 임시 저장.
        """
        if not os.path.exists(local_path):
            raise StorageUploadError(f"Local file not found: {local_path}")

        try:
            bucket = self._get_bucket(bucket_name)
            if not bucket:
                raise StorageUploadError("Storage bucket not initialized")
            
            blob = bucket.blob(dest_path)

            if content_type:
                blob.upload_from_filename(local_path, content_type=content_type)
            else:
                blob.upload_from_filename(local_path)

            return dest_path

        except Exception as e:
            raise StorageUploadError(f"Upload failed: {e}") from e

    def upload_video(
        self,
        *,
        uid: str,
        video_id: str,
        local_video_path: str,
        bucket_name: Optional[str] = None,
        delete_local: bool = False,
    ) -> str:
        dest_path = video_object_path(uid, video_id)

        storage_path = self.upload_file_to_storage(
            bucket_name=bucket_name,
            local_path=local_video_path,
            dest_path=dest_path,
            content_type="video/mp4",
        )

        if delete_local: # upload 완료 후 로컬 파일 삭제를 위한 변수
            try:
                os.remove(local_video_path)
            except Exception:
                pass

        return storage_path

    def download_file(self, storage_path: str, local_path: str) -> str:
        """Firebase Storage에서 로컬로 파일 다운로드. local_path 반환."""
        try:
            blob = self._get_bucket().blob(storage_path)
            if not blob.exists():
                raise StorageReadError(f"Storage file not found: {storage_path}")
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            blob.download_to_filename(local_path)
            return local_path
        except StorageReadError:
            raise
        except Exception as exc:
            raise StorageReadError(f"Failed to download from storage: {storage_path}") from exc

    def read_json(self, storage_path: str) -> Dict[str, Any]:
        if not storage_path:
            raise BadRequestError("storage_path is required")

        try:
            blob = self._get_bucket().blob(storage_path)
            if not blob.exists():
                raise StorageReadError(f"Storage file not found: {storage_path}")
            raw_bytes = blob.download_as_bytes()
            return json.loads(raw_bytes.decode("utf-8"))
        except ValueError as exc:
            raise StorageReadError(
                "Firebase Storage bucket is not configured. Set FIREBASE_STORAGE_BUCKET in Cloud Run."
            ) from exc
        except StorageReadError:
            raise
        except json.JSONDecodeError as exc:
            raise StorageReadError(f"Invalid JSON file in storage: {storage_path}")
        except Exception as exc:
            raise StorageReadError(f"Failed to read JSON from storage: {storage_path}")
        
