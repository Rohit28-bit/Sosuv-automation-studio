"""Time helpers. Always use utcnow() (timezone-aware) instead of datetime.now()."""

from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC)
