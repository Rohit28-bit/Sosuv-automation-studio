from pathlib import Path

import pytest

from sosuv.nodes import FileRef, RunInfo
from sosuv.nodes.registry import registry


@pytest.fixture(scope="session", autouse=True)
def _discover_nodes() -> None:
    registry.discover()


@pytest.fixture
def run_info() -> RunInfo:
    return RunInfo(
        run_id="run-1",
        run_number=1,
        trigger="manual",
        cycle_key=None,
        workflow_id="wf-1",
        workflow_name="Test workflow",
        node_id="n1",
        node_label="Node",
        attempt=1,
        max_attempts=1,
    )


class FakeFiles:
    """In-memory FileAccess for node tests."""

    def __init__(self) -> None:
        self.saved: dict[str, Path] = {}

    async def save(self, local_path: Path, *, name: str | None = None) -> FileRef:
        ref = FileRef(
            id=f"f{len(self.saved) + 1}", name=name or local_path.name, size=local_path.stat().st_size
        )
        self.saved[ref.id] = local_path
        return ref

    async def fetch(self, ref: FileRef) -> Path:
        return self.saved[ref.id]


@pytest.fixture
def files() -> FakeFiles:
    return FakeFiles()
