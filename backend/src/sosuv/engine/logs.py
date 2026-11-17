"""Node log lines: what you see per node on the run page.

Flow: node calls ctx.log.info(...) -> NodeLogAdapter masks secrets -> LogSink.
    In-process: the sink is the worker's DatabaseLogSink (batches INSERTs every 0.5 s + NOTIFY).
    Subprocess: the child's sink prints JSON lines to stdout; the worker reads them into its sink.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol

from sosuv.core.time import utcnow

Level = Literal["INFO", "WARN", "ERROR"]
MASK = "****"
MAX_MESSAGE_CHARS = 10_000


@dataclass(frozen=True)
class LogLine:
    ts: datetime
    level: Level
    message: str


class LogSink(Protocol):
    def write(self, line: LogLine) -> None: ...


class MemoryLogSink:
    """Collects lines in memory. For tests."""

    def __init__(self) -> None:
        self.lines: list[LogLine] = []

    def write(self, line: LogLine) -> None:
        self.lines.append(line)

    @property
    def messages(self) -> list[str]:
        return [line.message for line in self.lines]


def mask_secrets(text: str, secrets: tuple[str, ...]) -> str:
    for secret in secrets:
        if len(secret) >= 4:  # don't mask tiny values like "1", they'd wreck the log
            text = text.replace(secret, MASK)
    return text


class NodeLogAdapter:
    """Implements the NodeLogger protocol that nodes see as ctx.log."""

    def __init__(self, sink: LogSink, *, secrets: tuple[str, ...] = ()) -> None:
        self._sink = sink
        self._secrets = secrets

    def _emit(self, level: Level, msg: str, args: tuple[object, ...]) -> None:
        try:
            text = msg % args if args else msg
        except (TypeError, ValueError):
            text = f"{msg} {args}"
        text = mask_secrets(text, self._secrets)[:MAX_MESSAGE_CHARS]
        self._sink.write(LogLine(ts=utcnow(), level=level, message=text))

    def debug(self, msg: str, *args: object) -> None:
        self._emit("INFO", msg, args)

    def info(self, msg: str, *args: object) -> None:
        self._emit("INFO", msg, args)

    def warning(self, msg: str, *args: object) -> None:
        self._emit("WARN", msg, args)

    def error(self, msg: str, *args: object) -> None:
        self._emit("ERROR", msg, args)


class DatabaseLogSink:
    """Step 7. Buffers lines and flushes them to task_logs in batches, then NOTIFY run_<id> so the
    API can push them to the browser over Server-Sent Events."""

    def write(self, line: LogLine) -> None:
        raise NotImplementedError("DatabaseLogSink is implemented in step 7")
