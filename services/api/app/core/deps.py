import hmac
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.db import get_session
from app.core.errors import Unauthorized


def app_settings(request: Request) -> Settings:
    return request.app.state.settings


SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(app_settings)]


async def editor_guard(request: Request) -> None:
    settings: Settings = request.app.state.settings
    token = settings.editor_token
    if token is None or not token.get_secret_value():
        return
    scheme, _, value = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(value.encode(), token.get_secret_value().encode()):
        raise Unauthorized("Editor token required")


EditorGuard = Depends(editor_guard)
