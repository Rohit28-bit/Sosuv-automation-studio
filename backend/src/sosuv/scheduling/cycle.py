"""Cycle rules: the same logic as frontend/src/lib/schedule.ts, in the workflow's own timezone. Step 8.

runs_on(cycle, day)            does the workflow have a run on this calendar day?
cycle_key(day)                 "YYYY-MM-DD", the run's unique key per workflow
start_at(cycle, day, "07:00")  the UTC moment a start node is due (DST-safe via zoneinfo)
deadline_at(cycle, day)        the UTC moment unstarted start nodes become "missed"
"""

from datetime import date, datetime
from typing import Any


def runs_on(cycle: dict[str, Any], day: date) -> bool:
    raise NotImplementedError("Cycle rules are implemented in step 8")


def cycle_key(day: date) -> str:
    return day.isoformat()


def start_at(cycle: dict[str, Any], day: date, hhmm: str) -> datetime:
    raise NotImplementedError("Cycle rules are implemented in step 8")


def deadline_at(cycle: dict[str, Any], day: date) -> datetime:
    raise NotImplementedError("Cycle rules are implemented in step 8")
