"""The storage interface. Keys look like "runs/<run_id>/<file_id>/<name>"."""

from pathlib import Path
from typing import Protocol


class FileStorage(Protocol):
    async def put(self, key: str, source: Path) -> int:
        """Store a local file under key. Returns its size in bytes."""
        ...

    async def get(self, key: str, destination: Path) -> None:
        """Copy the stored file to a local path."""
        ...

    async def delete(self, key: str) -> None: ...
