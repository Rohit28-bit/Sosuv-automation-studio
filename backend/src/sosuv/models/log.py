"""Per-node log lines (what the run page shows).

High-volume table. In production, partition by month on `ts` and drop/archive old partitions
(retention: 90 days). The partitioning is done in the Alembic migration.
"""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from sosuv.db.base import Base


class TaskLog(Base):
    __tablename__ = "task_logs"
    __table_args__ = (Index("ix_task_logs_task_attempt", "task_run_id", "attempt", "id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    task_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("task_runs.id", ondelete="CASCADE"))
    attempt: Mapped[int]
    ts: Mapped[datetime]
    level: Mapped[str] = mapped_column(String(10))  # INFO | WARN | ERROR
    message: Mapped[str] = mapped_column(Text)
