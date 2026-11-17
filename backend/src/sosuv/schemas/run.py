"""Mirrors Run, TaskRun, LogLine in frontend/src/types.ts."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from sosuv.domain.enums import RunStatus, RunTrigger, TaskStatus
from sosuv.schemas.common import ApiModel
from sosuv.schemas.workflow import WorkflowEdge, WorkflowNode

StartMode = Literal["now", "test-schedule"]


class StartRunRequest(ApiModel):
    mode: StartMode = "now"


class LogLineOut(ApiModel):
    ts: datetime
    level: Literal["INFO", "WARN", "ERROR"]
    message: str


class TaskRunOut(ApiModel):
    node_id: str
    status: TaskStatus  # "queued" is sent as "pending" (see services.runs)
    attempt: int
    max_attempts: int
    started_at: datetime | None
    ended_at: datetime | None
    error: str | None
    logs: list[LogLineOut] = Field(default_factory=list)
    scheduled_at: datetime | None = None
    output: dict[str, Any] | None = None


class RunOut(ApiModel):
    id: uuid.UUID
    number: int
    workflow_id: uuid.UUID
    workflow_name: str
    status: RunStatus
    trigger: RunTrigger
    cycle_key: str | None = None
    deadline_at: datetime | None = None
    started_at: datetime
    ended_at: datetime | None
    nodes: list[WorkflowNode]
    edges: list[WorkflowEdge]
    tasks: dict[str, TaskRunOut]
