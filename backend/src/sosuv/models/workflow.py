"""Workflows and their versions.

Every save creates a new, immutable WorkflowVersion. Runs point at the version they ran, so editing a
workflow never changes the history of old runs.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sosuv.db.base import Base, Timestamps, UUIDPrimaryKey


class Workflow(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "workflows"

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(default=False)
    # WorkflowCycle as JSON: {frequency, weekdays, dayOfMonth, timezone, deadline}
    cycle: Mapped[dict[str, Any]]
    failure_webhook: Mapped[dict[str, Any] | None]
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workflow_versions.id", use_alter=True, ondelete="SET NULL")
    )
    # Run numbers (#1, #2 …) are per workflow; incremented under a row lock.
    last_run_number: Mapped[int] = mapped_column(default=0)
    deleted_at: Mapped[datetime | None]

    current_version: Mapped["WorkflowVersion | None"] = relationship(foreign_keys=[current_version_id])


class WorkflowVersion(UUIDPrimaryKey, Base):
    __tablename__ = "workflow_versions"
    __table_args__ = (UniqueConstraint("workflow_id", "number"),)

    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"), index=True)
    number: Mapped[int]
    # Exactly what the canvas sends: [{id, position, data: {toolType, label, config, …}}]
    nodes: Mapped[list[Any]]
    edges: Mapped[list[Any]]
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
