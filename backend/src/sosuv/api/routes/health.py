"""Liveness (is the process up?) and readiness (can it reach the database?) for load balancers / k8s."""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text

from sosuv import __version__
from sosuv.api.deps import get_db
from sosuv.db.session import Database

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@router.get("/health/ready")
async def ready(db: Annotated[Database, Depends(get_db)]) -> JSONResponse:
    try:
        async with db.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": type(e).__name__})
    return JSONResponse(content={"status": "ok", "database": "ok"})
