"""NodeContext: the only door between a node and the platform.

The engine builds it for every task attempt. Nodes never touch the database or global state, so the
same node runs unchanged in tests (with fakes), in a subprocess, or in a container.
"""

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Protocol

from sosuv.nodes.errors import NodeCancelled
from sosuv.nodes.settings import FileRef


class NodeLogger(Protocol):
    """Lines appear in this node's log on the run page. Use %-style args: log.info("Got %d rows", n)."""

    def debug(self, msg: str, *args: object) -> None: ...
    def info(self, msg: str, *args: object) -> None: ...
    def warning(self, msg: str, *args: object) -> None: ...
    def error(self, msg: str, *args: object) -> None: ...


class FileAccess(Protocol):
    """Platform file storage, for passing files between nodes."""

    async def save(self, local_path: Path, *, name: str | None = None) -> FileRef:
        """Store a local file and get a reference to return in your output."""
        ...

    async def fetch(self, ref: FileRef) -> Path:
        """Get a local path to read a file a previous node produced."""
        ...


@dataclass(frozen=True)
class RunInfo:
    run_id: str
    run_number: int
    trigger: str  # manual | schedule | test
    cycle_key: str | None  # "YYYY-MM-DD" for scheduled runs
    workflow_id: str
    workflow_name: str
    node_id: str
    node_label: str
    attempt: int  # 1 on the first try
    max_attempts: int

    @property
    def run_date(self) -> date:
        """The business date of this run: the cycle day for scheduled runs, otherwise today (UTC)."""
        if self.cycle_key:
            return date.fromisoformat(self.cycle_key)
        return datetime.now(UTC).date()


class NodeContext:
    def __init__(
        self,
        *,
        run: RunInfo,
        inputs: Mapping[str, Mapping[str, Any]],
        log: NodeLogger,
        files: FileAccess,
        workdir: Path,
        is_cancelled: Callable[[], bool] = lambda: False,
    ) -> None:
        self.run = run
        self.inputs = inputs
        """Outputs of the parent nodes, keyed by parent node id."""
        self.log = log
        self.files = files
        self.workdir = workdir
        """A private temporary folder for this attempt. Deleted afterwards."""
        self._is_cancelled = is_cancelled

    def input_from(self, node_id: str) -> Mapping[str, Any]:
        """Output of one parent node. Raises KeyError if node_id is not a parent."""
        return self.inputs[node_id]

    def check_cancelled(self) -> None:
        """Call this in long loops. Raises NodeCancelled if the user cancelled the run."""
        if self._is_cancelled():
            raise NodeCancelled()
