"""SQLAlchemy tables. Import every model here so Alembic autogenerate sees them."""

from sosuv.models.audit import AuditEvent
from sosuv.models.file import StoredFile
from sosuv.models.log import TaskLog
from sosuv.models.run import Run, TaskRun
from sosuv.models.secret import Secret
from sosuv.models.user import User
from sosuv.models.workflow import Workflow, WorkflowVersion

__all__ = [
    "AuditEvent",
    "Run",
    "Secret",
    "StoredFile",
    "TaskLog",
    "TaskRun",
    "User",
    "Workflow",
    "WorkflowVersion",
]
