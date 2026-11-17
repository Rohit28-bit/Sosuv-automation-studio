"""The scheduler process. Step 8.

Only the instance holding the Postgres advisory lock (db/locks.py SCHEDULER_LEADER_LOCK) acts; others
wait as hot standbys. Every `scheduler_tick_seconds`:

    1. new cycles  for enabled workflows that run today (in their timezone), create the run
                   (INSERT … ON CONFLICT DO NOTHING on (workflow_id, cycle_key)); start nodes get
                   status=scheduled and scheduled_at, the rest pending
    2. due starts  scheduled tasks with scheduled_at <= now -> queued
    3. deadlines   runs past deadline_at: scheduled -> missed, descendants skipped, run failed, alert
    4. reaper      running tasks whose heartbeat is older than task_lease_seconds -> retry or failed

Everything is driven by the database, so a restart loses nothing and late ticks catch up.
"""

from sosuv.config import Settings


class Scheduler:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def tick(self) -> None:
        raise NotImplementedError("The scheduler tick is implemented in step 8")

    async def run_forever(self) -> None:
        raise NotImplementedError("The scheduler loop is implemented in step 8")
