"""The three processes. One codebase, scaled separately:

sosuv-api        HTTP API (stateless, run 2+ copies behind a load balancer)
sosuv-scheduler  creates runs and releases start nodes on time (one active leader)
sosuv-worker     claims queued tasks and runs node plugins (scale to N)
"""

import asyncio

import uvicorn

from sosuv.config import get_settings
from sosuv.observability.logging import configure_logging


def run_api() -> None:
    settings = get_settings()
    uvicorn.run(
        "sosuv.main:create_app",
        factory=True,
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.env == "dev",
        log_config=None,  # our structlog setup handles logging
    )


def run_scheduler() -> None:
    from sosuv.scheduling.scheduler import Scheduler

    settings = get_settings()
    configure_logging(settings)
    asyncio.run(Scheduler(settings).run_forever())


def run_worker() -> None:
    from sosuv.engine.worker import Worker

    settings = get_settings()
    configure_logging(settings)
    asyncio.run(Worker(settings).run_forever())
