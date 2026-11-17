"""Who did what, when (workflow edits, manual runs, retries, secret changes)."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from sosuv.db.base import Base, UUIDPrimaryKey


class AuditEvent(UUIDPrimaryKey, Base):
    __tablename__ = "audit_events"

    at: Mapped[datetime] = mapped_column(index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100))  # e.g. workflow.updated, run.cancelled
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(100), index=True)
    details: Mapped[dict[str, Any] | None]
