"""Run use cases and advance(): the heart of the engine. Step 5.

advance(run_id), always inside a transaction holding SELECT … FOR UPDATE on the run row, so two tasks
finishing at the same moment can't both start the same child:
    for each pending task:
        any parent failed / skipped / missed / cancelled  -> skipped
        all parents completed                            -> queued (available_at = now)
    every task terminal -> run completed (all completed or skipped-by-choice) or failed -> alert
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from sosuv.schemas.run import RunOut, StartMode
from sosuv.security.auth import CurrentUser


class RunService:
    def __init__(self, session: AsyncSession, user: CurrentUser) -> None:
        self.session = session
        self.user = user

    async def list(self, workflow_id: uuid.UUID | None = None) -> list[RunOut]:
        raise NotImplementedError("Run API is implemented in step 5")

    async def get(self, run_id: uuid.UUID) -> RunOut:
        raise NotImplementedError("Run API is implemented in step 5")

    async def start(self, workflow_id: uuid.UUID, mode: StartMode) -> RunOut:
        raise NotImplementedError("Run API is implemented in step 5")

    async def cancel(self, run_id: uuid.UUID) -> RunOut:
        raise NotImplementedError("Run API is implemented in step 5")

    async def retry_task(self, run_id: uuid.UUID, node_id: str) -> RunOut:
        raise NotImplementedError("Run API is implemented in step 5")

    async def start_task_now(self, run_id: uuid.UUID, node_id: str) -> RunOut:
        raise NotImplementedError("Run API is implemented in step 5")


async def advance(session: AsyncSession, run_id: uuid.UUID) -> None:
    raise NotImplementedError("advance() is implemented in step 5")
