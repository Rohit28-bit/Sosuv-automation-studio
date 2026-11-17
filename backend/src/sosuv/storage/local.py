"""Local-disk storage. Fine for one server or a shared volume; use S3 when workers run on many machines."""

import asyncio
import shutil
from pathlib import Path


class LocalFileStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError(f"Invalid storage key: {key!r}")
        return path

    async def put(self, key: str, source: Path) -> int:
        target = self._path(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(shutil.copyfile, source, target)
        return target.stat().st_size

    async def get(self, key: str, destination: Path) -> None:
        await asyncio.to_thread(shutil.copyfile, self._path(key), destination)

    async def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)
