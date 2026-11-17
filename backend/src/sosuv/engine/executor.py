"""Executors decide HOW a node runs. The worker doesn't care which one it has (Strategy pattern).

InProcessExecutor   runs the node in the current process. For tests and local debugging.
SubprocessExecutor  runs each attempt in its own OS process: a crash, hang or memory leak in a
                    node can't take down the worker, and a timeout kills the whole process tree.
DockerExecutor      (later) same contract, inside a container for full isolation.
"""

import asyncio
import tempfile
import traceback
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, Protocol

from sosuv.engine.logs import LogSink, NodeLogAdapter
from sosuv.nodes import FileAccess, NodeCancelled, NodeContext, NodeError, RunInfo
from sosuv.nodes.registry import NodeRegistry, registry


@dataclass(frozen=True)
class ExecutionRequest:
    task_run_id: str
    node_type: str
    run: RunInfo
    settings: Mapping[str, Any]  # already resolved ({{ }} filled in) and decrypted
    inputs: Mapping[str, Mapping[str, Any]]  # parent outputs, keyed by node id
    timeout_seconds: float
    secret_values: tuple[str, ...] = ()  # masked as **** in every log line


@dataclass(frozen=True)
class ExecutionResult:
    status: Literal["completed", "failed", "cancelled"]
    output: dict[str, Any] | None = None
    error: str | None = None
    retryable: bool = False
    details: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def completed(cls, output: dict[str, Any]) -> "ExecutionResult":
        return cls(status="completed", output=output)

    @classmethod
    def failed(cls, error: str, *, retryable: bool) -> "ExecutionResult":
        return cls(status="failed", error=error, retryable=retryable)


class Executor(Protocol):
    async def execute(
        self, request: ExecutionRequest, sink: LogSink, is_cancelled: Callable[[], bool]
    ) -> ExecutionResult: ...


class InProcessExecutor:
    def __init__(self, files: FileAccess, nodes: NodeRegistry = registry) -> None:
        self._files = files
        self._nodes = nodes

    async def execute(
        self, request: ExecutionRequest, sink: LogSink, is_cancelled: Callable[[], bool]
    ) -> ExecutionResult:
        log = NodeLogAdapter(sink, secrets=request.secret_values)
        node = self._nodes.create(request.node_type)
        with tempfile.TemporaryDirectory(prefix=f"sosuv-{request.task_run_id}-") as workdir:
            ctx = NodeContext(
                run=request.run,
                inputs=request.inputs,
                log=log,
                files=self._files,
                workdir=Path(workdir),
                is_cancelled=is_cancelled,
            )
            try:
                output = await asyncio.wait_for(node.execute(ctx, request.settings), request.timeout_seconds)
            except TimeoutError:
                log.error("Timed out after %d seconds", request.timeout_seconds)
                return ExecutionResult.failed(
                    f"Timed out after {request.timeout_seconds:.0f}s", retryable=True
                )
            except NodeCancelled:
                log.warning("Cancelled")
                return ExecutionResult(status="cancelled", error="Cancelled")
            except NodeError as e:
                log.error("%s", e.message)
                return ExecutionResult.failed(e.message, retryable=e.retryable)
            except Exception as e:  # a bug or unexpected failure inside the node
                log.error("Unexpected error: %s\n%s", e, traceback.format_exc())
                return ExecutionResult.failed(f"{type(e).__name__}: {e}", retryable=True)
        return ExecutionResult.completed(output)


class SubprocessExecutor:
    """Step 5. Spawns `python -m sosuv.engine.child`, sends the request on stdin, reads JSON-lines
    log and result messages (engine/protocol.py) from stdout, kills the process group on timeout or
    cancel."""

    async def execute(
        self, request: ExecutionRequest, sink: LogSink, is_cancelled: Callable[[], bool]
    ) -> ExecutionResult:
        raise NotImplementedError("SubprocessExecutor is implemented in step 5")
