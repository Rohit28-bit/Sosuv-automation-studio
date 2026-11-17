# Sosuv Automation Studio – Backend

FastAPI + PostgreSQL. One codebase, three processes:

| Command | Role | Scale |
|---|---|---|
| `sosuv-api` | HTTP API for the frontend | 2+ copies, stateless |
| `sosuv-scheduler` | creates runs, releases start nodes on time, deadlines, re-queues dead tasks | 1 active leader (+ standby) |
| `sosuv-worker` | claims queued tasks and runs node plugins in separate processes | N copies |

```
React UI ──► API ──► PostgreSQL ◄── Scheduler
                         ▲
                         └──────── Workers ──► subprocess per node ──► FTP / SQL / APIs …
```

## Run it locally

```bash
brew install uv                 # once
cp .env.example .env
docker compose up -d db         # Postgres
uv sync                         # creates .venv with Python 3.12 + dependencies
uv run alembic upgrade head     # create tables (after the first migration exists, step 2)
uv run sosuv-api                # http://localhost:8000/api/docs
uv run pytest                   # tests
uv run ruff check . && uv run mypy src && uv run lint-imports
```

## Code structure

```
src/sosuv/
  main.py            FastAPI app factory (middleware, routers, lifespan)
  entrypoints.py     the 3 commands
  config.py          every setting, from env vars SOSUV_*
  core/              errors, time helpers (no dependencies)
  domain/            pure rules: statuses, graph (start nodes, cycles). No I/O
  db/                engine/session, Base, advisory locks
  models/            SQLAlchemy tables
  schemas/           API shapes = frontend/src/types.ts (camelCase JSON)
  api/               routes (thin), deps (DI), error handlers, middleware
  services/          use cases: workflows, runs + advance(), validation
  scheduling/        cycle rules + the scheduler loop
  engine/            queue, worker, executors, child process, expressions, node logs, retry
  nodes/             THE NODE SDK + built-in nodes  ← where new functionality goes
  storage/           files passed between nodes (local now, S3 later)
  notifications/     Slack / Teams / webhook alerts
  security/          Firebase auth, secret encryption
  observability/     JSON logging, Prometheus metrics
tests/unit, tests/integration
```

### Rules (checked by `lint-imports`, see pyproject.toml)
1. **Layers only point down:** `api → services → models → db`. Routes never contain business logic;
   services never raise HTTP errors (they raise `core.errors`), so workers and the scheduler reuse them.
2. **Nodes only use the node SDK** (`sosuv.nodes`). They never import the database, API or engine;
   everything comes through `NodeContext`. That is what makes them safe, testable plugins.
3. **`domain/` is pure** — no database, no FastAPI.
4. **Swappable parts sit behind a Protocol:** `TaskQueue`, `Executor`, `FileStorage`, `Notifier`.

### Design patterns used
| Pattern | Where | Why |
|---|---|---|
| Plugin + Registry | `nodes/registry.py`, `@register_node` | add a node without touching anything else |
| Template Method | `BaseNode.execute()` → your `run()` | validation, output checks done once for all nodes |
| Strategy | executors, queue, storage, notifiers | swap subprocess→Docker, Postgres→Redis, disk→S3 |
| Dependency Injection | `api/deps.py` | testable routes and services |
| Service layer | `services/` | same logic for API, workers and scheduler |
| Immutable versions | `workflow_versions` | old runs never change when a workflow is edited |

## Adding a node (the whole process)

1. Create `src/sosuv/nodes/builtin/send_email.py` (copy `wait.py`):

```python
from pydantic import SecretStr
from sosuv.nodes import (
    BaseNode,
    NodeContext,
    NodeOutput,
    NodeSettings,
    RetryableNodeError,
    register_node,
    setting,
)


class SendEmailSettings(NodeSettings):  # → the settings form in the UI
    to: str = setting(label="To", placeholder="team@company.com")
    subject: str = setting(label="Subject")
    body: str = setting("", label="Body", widget="textarea")
    smtp_password: SecretStr = setting(label="SMTP password")  # encrypted, masked in logs


class SendEmailOutput(NodeOutput):  # → what the next nodes receive
    message_id: str


@register_node
class SendEmailNode(BaseNode[SendEmailSettings, SendEmailOutput]):
    type = "send_email"  # stable id saved in workflows; never rename
    name = "Send Email"
    description = "Send an email."
    icon = "mail"
    color = "#f59e0b"
    category = "Notifications"

    async def run(self, ctx: NodeContext, s: SendEmailSettings) -> SendEmailOutput:
        ctx.log.info("Sending to %s", s.to)
        report = ctx.inputs.get("build_report", {})  # outputs of parent nodes
        ...  # do the work; raise RetryableNodeError on network errors
        return SendEmailOutput(message_id="...")
```

2. Add a test in `tests/unit/` with `InProcessExecutor` (see `test_node_sdk.py`). No database needed.
3. Done. It appears in `GET /api/tools` → the Task Library and form update automatically, and workers can run it.

**Type → UI widget:** `str` text · `int`/`float` number · `bool` checkbox · `Literal[...]`/`Enum` select ·
`SecretStr` password · `JsonObject`/`JsonValue` JSON textarea · `setting(widget="textarea")` multi-line.

**Errors:** `NodeConfigError` (bad settings, never retried) · `RetryableNodeError` (temporary, retried with
back-off) · `NodeError` (fail; retried only if the node has retries). Call `ctx.check_cancelled()` in long loops.

**Data between nodes:** small results in the output (stored as JSON, max 256 KB); files via
`ctx.files.save(path)` → return the `FileRef`. Later nodes read `ctx.inputs[parent_id]` or use
`{{ nodes.<id>.output.<field> }}` in their settings.

**Nodes in a separate package** (e.g. customer-specific): declare an entry point and `pip install` it —
no change to this repo:
```toml
[project.entry-points."sosuv.nodes"]
acme = "acme_sosuv_nodes"
```

## Build steps
| Step | What | Status |
|---|---|---|
| 0–1 | project skeleton, config, logging, health, node SDK, `/api/tools` | ✅ done |
| 2 | Postgres + first Alembic migration | next |
| 3 | workflow API (CRUD + versions + validation) → frontend uses `VITE_API_MODE=http` | |
| 4 | node SDK ✅ (done early) | |
| 5 | runs: `advance()`, queue, worker, SubprocessExecutor | |
| 6 | data passing: `{{ }}` expressions, file storage | |
| 7 | node logs to DB + live stream (SSE) | |
| 8 | scheduler: cycles, start times, deadlines, reaper | |
| 9 | real FTP / SQL / Postgres / Mongo / Excel / file nodes | |
| 10 | Slack / Teams / webhook alerts | |
| 11 | Firebase login + roles + audit | |
| 12 | CI, Docker, metrics dashboards, deploy | |

Unbuilt endpoints return **501** with `{"code": "not_implemented"}` so the frontend gets a clear answer.
