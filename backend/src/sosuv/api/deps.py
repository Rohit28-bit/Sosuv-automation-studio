"""FastAPI dependencies (Dependency Injection): database session, current user, services."""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from sosuv.db.session import Database
from sosuv.security.auth import DEV_USER, CurrentUser
from sosuv.services.runs import RunService
from sosuv.services.workflows import WorkflowService


def get_db(request: Request) -> Database:
    db: Database = request.app.state.db
    return db


async def get_session(db: Annotated[Database, Depends(get_db)]) -> AsyncIterator[AsyncSession]:
    async with db.session() as session:
        yield session


async def get_current_user() -> CurrentUser:
    # Step 11: read "Authorization: Bearer <firebase id token>", verify, load the user.
    return DEV_USER


Session = Annotated[AsyncSession, Depends(get_session)]
User = Annotated[CurrentUser, Depends(get_current_user)]


def get_workflow_service(session: Session, user: User) -> WorkflowService:
    return WorkflowService(session, user)


def get_run_service(session: Session, user: User) -> RunService:
    return RunService(session, user)


Workflows = Annotated[WorkflowService, Depends(get_workflow_service)]
Runs = Annotated[RunService, Depends(get_run_service)]
