from fastapi import APIRouter
from .endpoints import messages, status, calls, groups, offline

api_router = APIRouter()
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(offline.router, prefix="/offline", tags=["offline"])
