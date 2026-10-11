from fastapi import APIRouter

from app.modules.ops.health import router as health_router

router = APIRouter()
router.include_router(health_router)
