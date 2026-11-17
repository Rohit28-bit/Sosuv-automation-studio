"""Messages between the worker and the child process (one JSON object per line).

worker -> child (stdin, once):   StartMessage
child  -> worker (stdout, many): LogMessage … then exactly one ResultMessage
Anything else the child prints to stdout/stderr is captured as an INFO/ERROR log line.
"""

from typing import Any, Literal

from pydantic import BaseModel


class StartMessage(BaseModel):
    kind: Literal["start"] = "start"
    task_run_id: str
    node_type: str
    run: dict[str, Any]  # RunInfo fields
    settings: dict[str, Any]
    inputs: dict[str, dict[str, Any]]
    secret_values: list[str]


class LogMessage(BaseModel):
    kind: Literal["log"] = "log"
    ts: str
    level: Literal["INFO", "WARN", "ERROR"]
    message: str


class ResultMessage(BaseModel):
    kind: Literal["result"] = "result"
    status: Literal["completed", "failed", "cancelled"]
    output: dict[str, Any] | None = None
    error: str | None = None
    retryable: bool = False
