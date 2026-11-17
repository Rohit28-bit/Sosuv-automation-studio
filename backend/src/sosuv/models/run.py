"""Runs and task runs.

`task_runs` doubles as the job queue: workers claim rows with
    SELECT … WHERE status = 'queued' AND queue = ANY(:queues) AND available_at <= now()
    ORDER BY priority DESC, available_at FOR UPDATE SKIP LOCKED LIMIT 1
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sosuv.db.base import Base, UUIDPrimaryKey
from sosuv.domain.enums import RunStatus, RunTrigger, TaskStatus


def _enum(e: type) -> Enum:
    return Enum(e, native_enum=False, length=20, values_callable=lambda x: [m.value for m in x])


class Run(UUIDPrimaryKey, Base):
    __tablename__ = "runs"
    __table_args__ = (
        # One scheduled run per workflow per cycle day, even with several schedulers or restarts.
        Index(
            "uq_runs_scheduled_cycle",
            "workflow_id",
            "cycle_key",
            unique=True,
            postgresql_where=text("trigger = 'schedule'"),
        ),
        Index("ix_runs_workflow_started", "workflow_id", "started_at"),
    )

    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"))
    workflow_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_versions.id"))
    number: Mapped[int]
    trigger: Mapped[RunTrigger] = mapped_column(_enum(RunTrigger))
    status: Mapped[RunStatus] = mapped_column(_enum(RunStatus), default=RunStatus.RUNNING, index=True)
    cycle_key: Mapped[str | None] = mapped_column(String(10))  # "YYYY-MM-DD"
    deadline_at: Mapped[datetime | None] = mapped_column(index=True)
    started_at: Mapped[datetime]
    ended_at: Mapped[datetime | None]
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    tasks: Mapped[list["TaskRun"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class TaskRun(UUIDPrimaryKey, Base):
    __tablename__ = "task_runs"
    __table_args__ = (
        UniqueConstraint("run_id", "node_id"),
        # The queue index: what workers scan when claiming.
        Index(
            "ix_task_runs_claimable",
            "queue",
            "priority",
            "available_at",
            postgresql_where=text("status = 'queued'"),
        ),
        Index("ix_task_runs_due_starts", "scheduled_at", postgresql_where=text("status = 'scheduled'")),
        Index("ix_task_runs_heartbeat", "heartbeat_at", postgresql_where=text("status = 'running'")),
    )

    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"))
    node_id: Mapped[str] = mapped_column(String(100))
    node_type: Mapped[str] = mapped_column(String(100))
    status: Mapped[TaskStatus] = mapped_column(_enum(TaskStatus))

    attempt: Mapped[int] = mapped_column(default=0)
    max_attempts: Mapped[int] = mapped_column(default=1)
    queue: Mapped[str] = mapped_column(String(50), default="default")
    priority: Mapped[int] = mapped_column(default=0)

    scheduled_at: Mapped[datetime | None]  # start nodes: when they are due
    available_at: Mapped[datetime | None]  # queued tasks: not before (retry back-off)
    started_at: Mapped[datetime | None]
    ended_at: Mapped[datetime | None]

    worker_id: Mapped[str | None] = mapped_column(String(200))
    heartbeat_at: Mapped[datetime | None]

    output: Mapped[dict[str, Any] | None]  # the node's NodeOutput as JSON (small data + FileRefs)
    error: Mapped[str | None] = mapped_column(Text)

    run: Mapped[Run] = relationship(back_populates="tasks")
