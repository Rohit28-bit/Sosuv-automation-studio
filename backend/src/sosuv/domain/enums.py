"""Statuses and triggers. Values match the frontend's types.ts exactly."""

from enum import StrEnum


class CycleFrequency(StrEnum):
    MANUAL = "manual"
    DAILY = "daily"
    WEEKDAYS = "weekdays"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RunTrigger(StrEnum):
    MANUAL = "manual"  # "Execute workflow": every start node starts now
    SCHEDULE = "schedule"  # created by the scheduler, one per cycle
    TEST = "test"  # "Test schedule": like a scheduled run, waiting sped up


class RunStatus(StrEnum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskStatus(StrEnum):
    SCHEDULED = "scheduled"  # start node waiting for its start time
    PENDING = "pending"  # waiting for the nodes before it
    QUEUED = "queued"  # ready; waiting for a worker (shown as "pending" in the UI)
    RUNNING = "running"
    RETRYING = "retrying"  # failed, will be queued again after a back-off
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"
    MISSED = "missed"  # start node whose time never came before the deadline

    @property
    def is_terminal(self) -> bool:
        return self in TERMINAL_TASK_STATUSES


TERMINAL_TASK_STATUSES = frozenset(
    {TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.SKIPPED, TaskStatus.CANCELLED, TaskStatus.MISSED}
)
