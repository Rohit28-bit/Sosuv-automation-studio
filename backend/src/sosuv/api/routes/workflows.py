"""Workflow endpoints. Paths match frontend/src/api/http.ts."""

import uuid

from fastapi import APIRouter, status

from sosuv.api.deps import Runs, Workflows
from sosuv.schemas.run import RunOut, StartRunRequest
from sosuv.schemas.workflow import WorkflowInput, WorkflowOut

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowOut])
async def list_workflows(service: Workflows) -> list[WorkflowOut]:
    return await service.list()


@router.post("", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(data: WorkflowInput, service: Workflows) -> WorkflowOut:
    return await service.create(data)


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(workflow_id: uuid.UUID, service: Workflows) -> WorkflowOut:
    return await service.get(workflow_id)


@router.put("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(workflow_id: uuid.UUID, data: WorkflowInput, service: Workflows) -> WorkflowOut:
    return await service.update(workflow_id, data)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(workflow_id: uuid.UUID, service: Workflows) -> None:
    await service.delete(workflow_id)


@router.post("/{workflow_id}/run", response_model=RunOut, status_code=status.HTTP_201_CREATED)
async def start_run(workflow_id: uuid.UUID, body: StartRunRequest, runs: Runs) -> RunOut:
    return await runs.start(workflow_id, body.mode)
