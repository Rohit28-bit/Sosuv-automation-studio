"""FastAPI application factory."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sosuv import __version__
from sosuv.api.errors import register_exception_handlers
from sosuv.api.middleware import RequestContextMiddleware
from sosuv.api.routes import health, runs, tools, workflows
from sosuv.config import Settings, get_settings
from sosuv.db.session import Database
from sosuv.nodes.registry import registry
from sosuv.observability.logging import configure_logging
from sosuv.observability.metrics import metrics_app


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        registry.discover()
        app.state.db = Database(settings)
        yield
        await app.state.db.dispose()

    app = FastAPI(
        title="Sosuv Automation Studio API",
        version=__version__,
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.state.settings = settings

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)

    for router in (health.router, tools.router, workflows.router, runs.router):
        app.include_router(router, prefix="/api")
    app.mount("/metrics", metrics_app())
    return app
