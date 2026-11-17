"""Mirrors Workflow, WorkflowNode, WorkflowCycle … in frontend/src/types.ts."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from sosuv.domain.enums import CycleFrequency
from sosuv.schemas.common import ApiModel

ConfigValue = str | int | float | bool


class WorkflowCycle(ApiModel):
    frequency: CycleFrequency = CycleFrequency.MANUAL
    weekdays: list[int] = Field(default_factory=lambda: [1])  # 0 = Sunday … 6 = Saturday
    day_of_month: int = Field(1, ge=1, le=31)
    timezone: str = "UTC"
    deadline: str = "23:59"  # "HH:MM"


class TaskNodeData(ApiModel):
    tool_type: str
    label: str
    config: dict[str, ConfigValue] = Field(default_factory=dict)
    retries: int = Field(0, ge=0, le=20)
    retry_delay_sec: int = Field(60, ge=0)
    timeout_sec: int = Field(3600, ge=1)
    start_time: str | None = None  # "HH:MM", start nodes only


class Position(ApiModel):
    x: float
    y: float


class WorkflowNode(ApiModel):
    id: str
    position: Position
    data: TaskNodeData


class WorkflowEdge(ApiModel):
    id: str
    source: str
    target: str


class FailureWebhook(ApiModel):
    enabled: bool = False
    provider: Literal["slack", "teams", "custom"] = "slack"
    webhook_url: str = ""
    channel: str | None = None
    notify_on: Literal["failure", "always"] = "failure"
    include_logs: bool | None = None


class WorkflowInput(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    enabled: bool = False
    cycle: WorkflowCycle = Field(default_factory=WorkflowCycle)
    failure_webhook: FailureWebhook | None = None
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)


class WorkflowOut(WorkflowInput):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
