"""The task queue. Postgres today; the interface lets us swap to Redis/Celery/Temporal later.

Claim query (one transaction, safe with any number of workers):
    UPDATE task_runs SET status='running', worker_id=:w, attempt=attempt+1,
           started_at=now(), heartbeat_at=now()
    WHERE id = (
        SELECT id FROM task_runs
        WHERE status='queued' AND queue = ANY(:queues) AND (available_at IS NULL OR available_at <= now())
        ORDER BY priority DESC, available_at NULLS FIRST
        FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *
"""

import uuid
from dataclasses import dataclass
from typing import Protocol

from sosuv.engine.executor import ExecutionResult


@dataclass(frozen=True)
class ClaimedTask:
    task_run_id: uuid.UUID
    run_id: uuid.UUID
    node_id: str
    node_type: str
    attempt: int
    max_attempts: int


class TaskQueue(Protocol):
    async def claim(self, worker_id: str, queues: list[str]) -> ClaimedTask | None: ...
    async def heartbeat(self, task_run_id: uuid.UUID, worker_id: str) -> bool:
        """Returns False if the task was cancelled or taken away, so the worker should stop it."""
        ...

    async def finish(self, task: ClaimedTask, result: ExecutionResult) -> None:
        """Save the result, schedule a retry if allowed, then advance the run."""
        ...

    async def release(self, task: ClaimedTask) -> None:
        """Put a task back unchanged (graceful shutdown)."""
        ...


class PostgresTaskQueue:
    """Step 5."""

    async def claim(self, worker_id: str, queues: list[str]) -> ClaimedTask | None:
        raise NotImplementedError("PostgresTaskQueue is implemented in step 5")
