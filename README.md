# Sosuv Automation Studio

A visual task scheduler: build workflows from nodes (FTP, SQL, Excel, APIs …) on a canvas, give each start
node its own start time, and let the backend run them on schedule — with retries, deadlines, live logs and
Slack/Teams alerts.

| Folder | What | Stack |
|---|---|---|
| [`frontend/`](frontend/) | Workflow builder, schedules, runs, logs (v1 complete, runs on demo data) | React, TypeScript, Vite, React Flow, Tailwind |
| [`backend/`](backend/) | API, scheduler, workers, node plugin system (in progress) | Python 3.12, FastAPI, PostgreSQL, SQLAlchemy |

Live frontend demo: https://sosuv-automation-studio.vercel.app

```
React UI ──► FastAPI API ──► PostgreSQL ◄── Scheduler (when things run)
                                  ▲
                                  └──────── Workers ──► node plugins (one process per task)
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for setup and design.
