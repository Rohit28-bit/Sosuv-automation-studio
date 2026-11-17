"""Turns exceptions into one consistent JSON error shape: {code, message, details, requestId}."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from sosuv.api.middleware import current_request_id
from sosuv.core.errors import AppError
from sosuv.observability.logging import get_logger
from sosuv.schemas.common import ErrorResponse

log = get_logger(__name__)


def _response(status: int, code: str, message: str, details: object = None) -> JSONResponse:
    body = ErrorResponse(code=code, message=message, details=details, request_id=current_request_id())
    return JSONResponse(status_code=status, content=body.model_dump(by_alias=True, exclude_none=True))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError) -> JSONResponse:
        return _response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(NotImplementedError)
    async def not_implemented(_: Request, exc: NotImplementedError) -> JSONResponse:
        return _response(501, "not_implemented", str(exc) or "Not implemented yet")

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled_error", path=request.url.path)
        return _response(
            500, "internal_error", "Something went wrong. Quote the request id when reporting it."
        )
