from typing import Any

import anyio

from app.modules.media.storage.base import StoredFile


class S3Storage:
    def __init__(self, settings: Any) -> None:
        import boto3

        self.settings = settings
        self.client = boto3.client("s3", endpoint_url=settings.s3_endpoint_url, region_name=settings.s3_region)
        self.bucket = settings.s3_bucket

    def url(self, key: str) -> str:
        base = self.settings.s3_public_base_url
        if base:
            return f"{base.rstrip('/')}/{key}"
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"

    async def put(self, key: str, data: bytes, mime: str, width: int | None, height: int | None) -> str:
        await anyio.to_thread.run_sync(
            lambda: self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=mime,
                CacheControl="public, max-age=31536000, immutable",
            )
        )
        return self.url(key)

    async def get(self, key: str) -> StoredFile | None:
        return None

    async def presign_put(self, key: str, mime: str, size: int) -> str:
        return await anyio.to_thread.run_sync(
            lambda: self.client.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": key, "ContentType": mime, "ContentLength": size},
                ExpiresIn=900,
            )
        )
