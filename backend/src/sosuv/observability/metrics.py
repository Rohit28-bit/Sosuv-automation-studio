"""Prometheus metrics. Define every metric here so names stay consistent across processes."""

from prometheus_client import Counter, Gauge, Histogram, make_asgi_app
from starlette.types import ASGIApp

RUNS_FINISHED = Counter(
    "sosuv_runs_finished_total", "Runs that reached a final status", ["status", "trigger"]
)
TASKS_FINISHED = Counter("sosuv_tasks_finished_total", "Task attempts that finished", ["node_type", "status"])
TASK_DURATION = Histogram(
    "sosuv_task_duration_seconds",
    "Duration of one task attempt",
    ["node_type"],
    buckets=(0.5, 1, 5, 15, 60, 300, 900, 3600),
)
QUEUE_DEPTH = Gauge("sosuv_queue_depth", "Tasks waiting to be claimed", ["queue"])
WORKERS_BUSY = Gauge("sosuv_worker_busy_slots", "Task slots in use on this worker")


def metrics_app() -> ASGIApp:
    return make_asgi_app()
