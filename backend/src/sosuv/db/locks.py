"""Postgres advisory locks: cluster-wide mutexes without an extra service.

Used so only one scheduler is active (leader election), and for other one-at-a-time jobs.
"""

import zlib

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


def lock_key(name: str) -> int:
    """Stable 32-bit key for a lock name."""
    return zlib.crc32(name.encode())


async def try_advisory_lock(conn: AsyncConnection, name: str) -> bool:
    """Session-level lock: held until released or the connection closes (e.g. the process dies)."""
    result = await conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": lock_key(name)})
    return bool(result.scalar())


async def advisory_unlock(conn: AsyncConnection, name: str) -> None:
    await conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": lock_key(name)})


SCHEDULER_LEADER_LOCK = "sosuv.scheduler.leader"
