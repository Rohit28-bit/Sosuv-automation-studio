# Sosuv Automation Studio – Frontend

React + TypeScript + Vite, React Flow (canvas), Tailwind CSS.

```bash
npm install
npm run dev        # http://localhost:5173
```

## How it works
- **Task Library (left):** the 7 tools from `src/tools/registry.ts`. Drag one onto the canvas (or double-click it).
- **Canvas (middle):** each tool becomes a node. Drag from a node's right dot to another node's left dot to draw an arrow (run order).
  Select a node or arrow and press Delete/Backspace to remove it.
- **Settings (right):** click a node to fill in its settings. The form is generated from the tool's `fields`.
- **Validate / Save / Run** in the top bar. Run opens the live run view (graph colors, task table, logs, retry, cancel).

## Scheduling: several start nodes, each at its own time
- **Workflow schedule** (toolbar → *Schedule*) sets how often it runs: manual, every day, weekdays, weekly or monthly,
  plus a timezone and a **deadline**.
- **Start nodes** are nodes with no arrows coming in. Click one to set its **start time**; the canvas shows it as a ⏰ badge.
  Example: *Load Sales* 7:00, *Load Inventory* 9:00 → *Build Report* runs once **both** have succeeded.
- **One run per cycle** (e.g. per day). Start nodes wait as `scheduled` until their time; other nodes wait as `pending`
  until every node pointing into them has completed.
- **Deadline:** start nodes that haven't started by then become `missed`, nodes after them are `skipped`, and the run fails.
- **Execute workflow** starts every start node now. **Test schedule** plays out one cycle with the waiting sped up
  (1 hour = 3 seconds in mock mode). On the run page, **Start now** starts a waiting start node early.

## Backend
There is no backend yet, so `src/api/mock.ts` stands in for it: data is kept in the browser's localStorage
and runs are simulated. To test failures, put the word `FAIL` in any task setting.

When the FastAPI backend is ready, create `.env.local` with `VITE_API_MODE=http`. Calls then go to `/api/...`
(proxied to `http://localhost:8000`). The endpoints the backend must provide are listed in `src/api/http.ts`.

What the FastAPI scheduler needs to do (the mock in `src/api/mock.ts` shows the same rules):
- At the start of each cycle day, create **one run per workflow** (`UNIQUE(workflow_id, cycle_key)`), with each start node
  `scheduled` and `scheduledAt` set from its `startTime` in the workflow's `cycle.timezone`.
- Schedule one job per start node at its `scheduledAt`, plus one at the deadline. When a job fires, set that task to
  `pending` and advance the run.
- `POST /workflows/{id}/run` with `{"mode": "now" | "test-schedule"}`; `POST /runs/{id}/tasks/{node_id}/start` starts a
  waiting start node early.

## Folder layout
```
src/
  api/          Api interface, mock implementation, HTTP implementation
  tools/        the 7 tool definitions (fields drive the settings form)
  components/   TaskNode, ToolPalette, ConfigPanel, StatusBadge, Layout, RunsTable
  pages/        BuilderPage, RunDetailPage, ListPages (Dashboard, Workflows, Runs, Task Library)
  lib/          validation, formatting
  types.ts      shared types (match the future backend JSON)
```
