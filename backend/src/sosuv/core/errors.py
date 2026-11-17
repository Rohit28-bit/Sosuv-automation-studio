"""Application errors. Services raise these; api/errors.py turns them into HTTP responses.

Services never raise HTTPException: that keeps business logic usable from workers and the
scheduler, which have no HTTP layer.
"""

from typing import Any


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class NotFound(AppError):
    status_code = 404
    code = "not_found"


class Conflict(AppError):
    status_code = 409
    code = "conflict"


class ValidationFailed(AppError):
    status_code = 422
    code = "validation_failed"


class Forbidden(AppError):
    status_code = 403
    code = "forbidden"
