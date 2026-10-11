from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.media.models import File
from app.modules.media.storage.base import StoredFile


class DbStorage:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def put(self, key: str, data: bytes, mime: str, width: int | None, height: int | None) -> str:
        await self.session.execute(
            insert(File)
            .values(key=key, mime=mime, width=width, height=height, bytes=data)
            .on_conflict_do_nothing(index_elements=["key"])
        )
        return f"/api/v1/files/{key}"

    async def get(self, key: str) -> StoredFile | None:
        row = await self.session.get(File, key)
        return StoredFile(data=row.bytes, mime=row.mime) if row else None
