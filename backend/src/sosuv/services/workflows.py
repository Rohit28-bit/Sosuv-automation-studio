"""Workflow use cases. Step 3.

Saving always creates a new WorkflowVersion (nodes + edges frozen) and points
workflow.current_version_id at it. Delete is soft (deleted_at) so run history stays intact.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from sosuv.schemas.workflow import WorkflowInput, WorkflowOut
from sosuv.security.auth import CurrentUser


class WorkflowService:
    def __init__(self, session: AsyncSession, user: CurrentUser) -> None:
        self.session = session
        self.user = user

    async def list(self) -> list[WorkflowOut]:
        raise NotImplementedError("Workflow API is implemented in step 3")

    async def get(self, workflow_id: uuid.UUID) -> WorkflowOut:
        raise NotImplementedError("Workflow API is implemented in step 3")

    async def create(self, data: WorkflowInput) -> WorkflowOut:
        raise NotImplementedError("Workflow API is implemented in step 3")

    async def update(self, workflow_id: uuid.UUID, data: WorkflowInput) -> WorkflowOut:
        raise NotImplementedError("Workflow API is implemented in step 3")

    async def delete(self, workflow_id: uuid.UUID) -> None:
        raise NotImplementedError("Workflow API is implemented in step 3")
