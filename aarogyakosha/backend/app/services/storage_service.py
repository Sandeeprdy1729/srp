"""
AarogyaKosha - Storage Service
MinIO/S3 Compatible Object Storage
"""

import os
import uuid
from typing import Optional, BinaryIO
from datetime import datetime

import boto3
from botocore.config import Config

from app.core.config import settings


class StorageService:
    """
    Object storage service using MinIO (S3-compatible).
    Works with both MinIO (local) and AWS S3 (production).
    """

    def __init__(self):
        self.client = None
        self.bucket = settings.minio_bucket
        self.initialized = False

    async def initialize(self):
        """Initialize the S3/MinIO client."""
        if self.initialized:
            return

        try:
            self.client = boto3.client(
                "s3",
                endpoint_url=f"http://{settings.minio_endpoint}"
                if not settings.minio_secure
                else None,
                aws_access_key_id=settings.minio_access_key,
                aws_secret_access_key=settings.minio_secret_key,
                region_name=settings.minio_bucket,
                config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
            )

            # Ensure bucket exists
            try:
                self.client.head_bucket(Bucket=self.bucket)
            except:
                self.client.create_bucket(Bucket=self.bucket)

            self.initialized = True
            print(f"Storage service initialized with bucket: {self.bucket}")
        except Exception as e:
            print(f"Failed to initialize storage service: {e}")
            self.initialized = False

    def _get_key(self, user_id: str, filename: str) -> str:
        """Generate S3 key for a file."""
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        unique_id = str(uuid.uuid4())
        ext = os.path.splitext(filename)[1]
        return f"users/{user_id}/{date_prefix}/{unique_id}{ext}"

    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        user_id: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file to storage and return the key."""

        if not self.initialized:
            await self.initialize()

        key = self._get_key(user_id, filename)

        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type,
                Metadata={
                    "original-filename": filename,
                    "uploaded-at": datetime.utcnow().isoformat(),
                    "user-id": user_id,
                },
            )
            return key
        except Exception as e:
            print(f"Upload failed: {e}")
            # Fallback to local storage
            return await self._upload_local(file_content, filename, user_id)

    async def download_file(self, key: str) -> Optional[bytes]:
        """Download a file from storage."""

        if not self.initialized:
            await self.initialize()

        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except Exception as e:
            print(f"Download failed: {e}")
            return None

    async def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""

        if not self.initialized:
            await self.initialize()

        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            print(f"Delete failed: {e}")
            return False

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Generate a presigned URL for temporary access."""

        if not self.initialized:
            return None

        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
            return url
        except Exception as e:
            print(f"Presigned URL generation failed: {e}")
            return None

    async def _upload_local(
        self, file_content: bytes, filename: str, user_id: str
    ) -> str:
        """Fallback to local file storage."""

        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        unique_id = str(uuid.uuid4())
        ext = os.path.splitext(filename)[1]

        # Create directory
        local_dir = os.path.join(settings.upload_dir, "storage", user_id, date_prefix)
        os.makedirs(local_dir, exist_ok=True)

        # Save file
        local_path = os.path.join(local_dir, f"{unique_id}{ext}")
        with open(local_path, "wb") as f:
            f.write(file_content)

        return local_path

    async def generate_thumbnail(
        self, file_content: bytes, filename: str
    ) -> Optional[bytes]:
        """Generate a thumbnail for an image."""

        try:
            from PIL import Image
            import io

            image = Image.open(io.BytesIO(file_content))

            # Create thumbnail
            image.thumbnail((200, 200), Image.Resampling.LANCZOS)

            # Save as JPEG
            output = io.BytesIO()
            image.convert("RGB").save(output, format="JPEG", quality=80)

            return output.getvalue()
        except Exception as e:
            print(f"Thumbnail generation failed: {e}")
            return None


# Singleton instance
storage_service = StorageService()
