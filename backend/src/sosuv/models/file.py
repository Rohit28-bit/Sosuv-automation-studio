"""Files produced by nodes and passed to later nodes by reference (FileRef)."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from sosuv.db.base import Base, UUIDPrimaryKey


class StoredFile(UUIDPrimaryKey, Base):
    __tablename__ = "files"

    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    task_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("task_runs.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(500))
    size: Mapped[int] = mapped_column(BigInteger)
    content_type: Mapped[str | None] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(1000))  # path inside the storage backend
    created_at: Mapped[datetime]
    expires_at: Mapped[datetime | None] = mapped_column(index=True)
