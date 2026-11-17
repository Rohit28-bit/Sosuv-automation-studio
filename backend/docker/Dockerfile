# One image for api, scheduler and worker; the command decides which process runs.
FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
WORKDIR /app

# Dependencies first (cached layer), then the code.
COPY pyproject.toml uv.lock* README.md ./
RUN uv sync --no-dev --no-install-project
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
RUN uv sync --no-dev

ENV PATH="/app/.venv/bin:$PATH"
RUN useradd --create-home sosuv && mkdir -p /app/data/files && chown -R sosuv /app/data
USER sosuv
EXPOSE 8000
CMD ["sosuv-api"]
