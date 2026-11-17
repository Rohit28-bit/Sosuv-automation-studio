"""Run endpoints. Paths match frontend/src/api/http.ts."""

import uuid

from fastapi import APIRouter

from sosuv.api.deps import Runs
from sosuv.schemas.run import RunOut

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("", response_model=list[RunOut])
async def list_runs(runs: Runs, workflow_id: uuid.UUID | None = None) -> list[RunOut]:
    return await runs.list(workflow_id)


@router.get("/{run_id}", response_model=RunOut)
async def get_run(run_id: uuid.UUID, runs: Runs) -> RunOut:
    return await runs.get(run_id)


@router.post("/{run_id}/cancel", response_model=RunOut)
async def cancel_run(run_id: uuid.UUID, runs: Runs) -> RunOut:
    return await runs.cancel(run_id)


@router.post("/{run_id}/tasks/{node_id}/retry", response_model=RunOut)
async def retry_task(run_id: uuid.UUID, node_id: str, runs: Runs) -> RunOut:
    return await runs.retry_task(run_id, node_id)


@router.post("/{run_id}/tasks/{node_id}/start", response_model=RunOut)
async def start_task_now(run_id: uuid.UUID, node_id: str, runs: Runs) -> RunOut:
    return await runs.start_task_now(run_id, node_id)


@router.get("/{run_id}/logs/stream")
async def stream_logs(run_id: uuid.UUID) -> None:
    """Step 7: Server-Sent Events. LISTEN run_<id>, push new task_logs rows and status changes."""
    raise NotImplementedError("Live log streaming is implemented in step 7")
