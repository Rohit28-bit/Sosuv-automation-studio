/**
 * In-browser stand-in for the backend. Workflows and runs are saved in localStorage,
 * and runs are simulated with timers so the UI can be built and tested before
 * FastAPI exists.
 *
 * Simulation rules:
 *  - A task starts when every task pointing into it has completed.
 *  - Tasks with no dependency between them run at the same time.
 *  - If a task fails, every task after it is skipped.
 *  - To test failures: put the word FAIL in any setting of a task. It fails on
 *    every attempt and uses its retries first.
 *  - "Test schedule" runs: each start node waits for its own start time, then starts.
 *    The waiting is sped up (1 hour = 3 seconds) so a whole day plays out in seconds.
 *    The real scheduler (FastAPI backend) creates one such run per cycle with real waits.
 */
import {
  atTime,
  cycleFromLegacyCron,
  cycleKeyFor,
  DEFAULT_CYCLE,
  formatClock,
  formatClockFromIso,
  isScheduled,
  isValidTime,
  startNodeIds,
} from '../lib/schedule'
import { defaultConfig, getTool, TOOLS } from '../tools/registry'
import type { LogLine, Run, TaskRun, Workflow, WorkflowNode } from '../types'
import type { Api, StartMode, WorkflowInput } from './types'

const WF_KEY = 'orchestrator.workflows'
const RUN_KEY = 'orchestrator.runs'

const uid = () => crypto.randomUUID().slice(0, 8)
const now = () => new Date().toISOString()
const clone = <T>(v: T): T => structuredClone(v)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

const SEED_MULTI_START_KEY = 'sosuv.seed.multiStart'

let workflows: Workflow[] = load<Workflow[]>(WF_KEY, []).map(upgradeWorkflow)
let runs: Run[] = load(RUN_KEY, [])
const persistWorkflows = () => save(WF_KEY, workflows)
const persistRuns = () => save(RUN_KEY, runs.slice(0, 200))
persistWorkflows()

/**
 * Workflows saved before start nodes had their own times used one cron string ("schedule").
 * Turn it into a cycle, and give every start node the old cron's time.
 */
function upgradeWorkflow(saved: Workflow & { schedule?: string }): Workflow {
  if (saved.cycle) return saved
  const wf = { ...saved }
  const { cycle, startTime } = cycleFromLegacyCron(wf.schedule)
  delete wf.schedule
  const starts = startNodeIds(wf.nodes, wf.edges)
  wf.nodes = wf.nodes.map((n) => (starts.has(n.id) && startTime && !n.data.startTime ? { ...n, data: { ...n.data, startTime } } : n))
  return { ...wf, cycle }
}

const make = (
  id: string,
  type: string,
  x: number,
  y: number,
  label: string,
  overrides: Record<string, string | number | boolean>,
  startTime?: string,
): WorkflowNode => {
  const tool = getTool(type)!
  return {
    id,
    position: { x, y },
    data: { toolType: type, label, config: { ...defaultConfig(tool), ...overrides }, retries: 0, retryDelaySec: 5, timeoutSec: 3600, ...(startTime ? { startTime } : {}) },
  }
}

// ---------- seed example workflows on first load ----------
if (workflows.length === 0) {
  const nodes = [
    make('n1', 'ftp', 0, 120, 'Read FTP', { host: 'ftp.vendor.com', username: 'svc_orders', remoteFolder: '/outbound', filePattern: 'daily_*.xlsx', localPath: 'incoming/' }, '06:00'),
    make('n2', 'process_file', 260, 120, 'Validate File', { inputFile: 'incoming/daily_file.xlsx', format: 'xlsx', requiredColumns: 'id, amount, date' }),
    make('n3', 'convert_excel', 520, 120, 'Convert Excel', { inputFile: 'incoming/daily_file.xlsx', outputFile: 'processed/daily_file.csv' }),
    make('n4', 'run_sql', 780, 120, 'Run SQL', { connection: 'postgresql://reporting/prod', mode: 'stored procedure', sql: 'usp_LoadDailyFile', parameters: '{"BusinessDate": "{{run.date}}"}' }),
    make('n5', 'move_file', 1040, 30, 'Move File', { source: 'processed/daily_file.csv', destination: 'archive/' }),
    make('n6', 'api_call', 1040, 210, 'API Call', { method: 'POST', url: 'https://downstream.internal/notify', body: '{"status": "done"}' }),
  ]
  nodes[3].data.retries = 3
  const edges = [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n4', 'n6']].map(([s, t]) => ({ id: `e-${s}-${t}`, source: s, target: t }))
  workflows.push({
    id: uid(),
    name: 'Daily File Processing',
    description: 'Fetch the vendor file, load it into the reporting DB, archive it and notify downstream.',
    enabled: true,
    cycle: { ...DEFAULT_CYCLE, frequency: 'daily' },
    nodes,
    edges,
    createdAt: now(),
    updatedAt: now(),
  })
  persistWorkflows()
}

// Example with two start nodes on different times that meet in one node:
//   Load Sales (7:00) ──┐
//                       ├──► Build Report ──► Notify Team
//   Load Inventory (9:00)┘
if (!load(SEED_MULTI_START_KEY, false)) {
  const nodes = [
    make('a', 'ftp', 0, 0, 'Load Sales', { host: 'sftp.sales.internal', username: 'svc_sales', remoteFolder: '/exports', filePattern: 'sales_*.csv', localPath: 'incoming/sales/' }, '07:00'),
    make('b', 'run_sql', 0, 170, 'Load Inventory', { connection: 'postgresql://warehouse/prod', mode: 'stored procedure', sql: 'usp_SnapshotInventory' }, '09:00'),
    make('c', 'process_file', 300, 85, 'Build Report', { inputFile: 'incoming/sales/sales_daily.csv', format: 'csv', requiredColumns: 'sku, qty, amount' }),
    make('d', 'api_call', 580, 85, 'Notify Team', { method: 'POST', url: 'https://hooks.internal/report-ready', body: '{"report": "daily-sales"}' }),
  ]
  const edges = [['a', 'c'], ['b', 'c'], ['c', 'd']].map(([s, t]) => ({ id: `e-${s}-${t}`, source: s, target: t }))
  workflows.push({
    id: uid(),
    name: 'Sales & Inventory Report',
    description: 'Sales loads at 7:00, inventory at 9:00. The report builds once both are in, then the team is notified.',
    enabled: true,
    cycle: { ...DEFAULT_CYCLE, frequency: 'weekdays', deadline: '12:00' },
    nodes,
    edges,
    createdAt: now(),
    updatedAt: now(),
  })
  persistWorkflows()
  save(SEED_MULTI_START_KEY, true)
}

// ---------- run simulator ----------
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const timerKey = (runId: string, nodeId: string) => `${runId}:${nodeId}`

function log(task: TaskRun, level: LogLine['level'], message: string) {
  task.logs.push({ ts: now(), level, message })
}

function findRun(id: string): Run {
  const run = runs.find((r) => r.id === id)
  if (!run) throw new Error(`Run ${id} not found`)
  return run
}

const isTerminal = (s: TaskRun['status']) =>
  s === 'completed' || s === 'failed' || s === 'skipped' || s === 'cancelled' || s === 'missed'

const DEADLINE = '__deadline'
/** Test runs: how many real milliseconds one minute of waiting takes (50 ms → 1 hour = 3 s). */
const MOCK_MS_PER_MINUTE = 50

/** Sets timers for start nodes still waiting for their time, and for the deadline. */
function scheduleStarts(run: Run) {
  const waiting = Object.values(run.tasks).filter((t) => t.status === 'scheduled' && t.scheduledAt)
  const ms = (iso: string) => new Date(iso).getTime()
  const origin = Math.min(...waiting.map((t) => ms(t.scheduledAt!)), run.deadlineAt ? ms(run.deadlineAt) : Infinity)
  if (!Number.isFinite(origin)) return
  // The earliest start fires after 1 s; the rest keep their real spacing, sped up.
  const wait = (iso: string) => 1000 + ((ms(iso) - origin) / 60000) * MOCK_MS_PER_MINUTE
  for (const t of waiting) {
    timers.set(timerKey(run.id, t.nodeId), setTimeout(() => fireStart(run.id, t.nodeId, false), wait(t.scheduledAt!)))
  }
  if (run.deadlineAt) timers.set(timerKey(run.id, DEADLINE), setTimeout(() => passDeadline(run.id), wait(run.deadlineAt)))
}

/** A start node's time has come (or the user clicked "Start now"): let it run. */
function fireStart(runId: string, nodeId: string, early: boolean) {
  timers.delete(timerKey(runId, nodeId))
  const run = findRun(runId)
  const task = run.tasks[nodeId]
  if (run.status !== 'running' || task.status !== 'scheduled') return
  task.status = 'pending'
  if (early) {
    log(task, 'INFO', `Started early by user (scheduled for ${formatClockFromIso(task.scheduledAt)}).`)
  } else {
    log(task, 'INFO', `Start time ${formatClockFromIso(task.scheduledAt)} reached.${run.trigger === 'test' ? ' (Test run: waiting sped up, 1 hour = 3 seconds.)' : ''}`)
  }
  advance(runId)
}

/** Deadline passed: start nodes that never started are missed, and everything after them is skipped. */
function passDeadline(runId: string) {
  timers.delete(timerKey(runId, DEADLINE))
  const run = findRun(runId)
  if (run.status !== 'running') return
  for (const task of Object.values(run.tasks)) {
    if (task.status !== 'scheduled') continue
    clearTimeout(timers.get(timerKey(runId, task.nodeId)))
    timers.delete(timerKey(runId, task.nodeId))
    task.status = 'missed'
    task.endedAt = now()
    task.error = `Did not start before the deadline (${formatClockFromIso(run.deadlineAt)}).`
    log(task, 'ERROR', task.error)
  }
  advance(runId)
}

/** Moves a run forward: starts ready tasks, skips blocked ones, and closes the run when done. */
function advance(runId: string) {
  const run = findRun(runId)
  if (run.status !== 'running') return

  let changed = true
  while (changed) {
    changed = false
    for (const node of run.nodes) {
      const task = run.tasks[node.id]
      if (task.status !== 'pending') continue
      const parents = run.edges.filter((e) => e.target === node.id).map((e) => run.tasks[e.source])
      if (parents.some((p) => p.status === 'failed' || p.status === 'skipped' || p.status === 'cancelled' || p.status === 'missed')) {
        task.status = 'skipped'
        log(task, 'WARN', 'Skipped because an earlier task did not complete.')
        changed = true
      } else if (parents.every((p) => p.status === 'completed')) {
        startAttempt(run, node)
      }
    }
  }

  const all = Object.values(run.tasks)
  if (all.every((t) => isTerminal(t.status))) {
    run.status = all.every((t) => t.status === 'completed') ? 'completed' : 'failed'
    run.endedAt = now()
    clearTimeout(timers.get(timerKey(run.id, DEADLINE)))
    timers.delete(timerKey(run.id, DEADLINE))
  }
  persistRuns()
}

function startAttempt(run: Run, node: WorkflowNode) {
  const task = run.tasks[node.id]
  task.status = 'running'
  task.attempt += 1
  task.startedAt ??= now()
  task.endedAt = null
  task.error = null
  log(task, 'INFO', `Attempt ${task.attempt} of ${task.maxAttempts} started.`)
  for (const line of startLogs(node)) log(task, 'INFO', line)

  const shouldFail = Object.values(node.data.config).some((v) => typeof v === 'string' && v.includes('FAIL'))
  const duration = node.data.toolType === 'wait' ? Math.min(Number(node.data.config.seconds) || 1, 10) * 1000 : 800 + Math.random() * 2200

  timers.set(
    timerKey(run.id, node.id),
    setTimeout(() => finishAttempt(run.id, node, !shouldFail), duration),
  )
}

function finishAttempt(runId: string, node: WorkflowNode, ok: boolean) {
  const run = findRun(runId)
  const task = run.tasks[node.id]
  timers.delete(timerKey(runId, node.id))
  if (run.status !== 'running' || task.status !== 'running') return

  if (ok) {
    for (const line of successLogs(node)) log(task, 'INFO', line)
    task.status = 'completed'
    task.endedAt = now()
  } else if (task.attempt < task.maxAttempts) {
    task.status = 'retrying'
    log(task, 'ERROR', 'Task failed (simulated: a setting contains FAIL).')
    const delay = Math.min(node.data.retryDelaySec, 2)
    log(task, 'WARN', `Retrying in ${node.data.retryDelaySec}s${delay < node.data.retryDelaySec ? ` (shortened to ${delay}s in mock mode)` : ''}.`)
    timers.set(
      timerKey(runId, node.id),
      setTimeout(() => {
        const r = findRun(runId)
        if (r.status === 'running' && r.tasks[node.id].status === 'retrying') {
          startAttempt(r, node)
          persistRuns()
        }
      }, delay * 1000),
    )
  } else {
    task.status = 'failed'
    task.endedAt = now()
    task.error = 'Simulated failure: a setting contains FAIL.'
    log(task, 'ERROR', `${task.error} No retries left.`)
  }
  persistRuns()
  advance(runId)
}

function startLogs(node: WorkflowNode): string[] {
  const c = node.data.config
  switch (node.data.toolType) {
    case 'ftp':
      return [`Connecting to ${c.protocol}://${c.host}:${c.port} as ${c.username}`, `${c.action === 'upload' ? 'Uploading to' : 'Listing'} ${c.remoteFolder} (pattern ${c.filePattern})`]
    case 'run_sql':
      return [`Connecting to ${c.dbType} database`, c.mode === 'stored procedure' ? `Calling ${c.sql}` : 'Executing query']
    case 'postgres':
      return [`Connecting to PostgreSQL ${c.host}:${c.port || 5432}/${c.database} as ${c.username}`, `Executing ${c.operation || 'query'}`]
    case 'mongodb':
      return [`Connecting to MongoDB database "${c.database}"`, `Running ${c.operation || 'find'} on collection "${c.collection}"`]
    case 'convert_excel':
      return [`Reading ${c.inputFile}`, `Converting to ${String(c.outputFormat).toUpperCase()}`]
    case 'move_file':
      return [`${c.mode === 'copy' ? 'Copying' : 'Moving'} ${c.source} to ${c.destination}`]
    case 'api_call':
      return [`${c.method} ${c.url}`]
    case 'process_file':
      return [`Reading ${c.inputFile} as ${c.format}`, c.requiredColumns ? `Checking required columns: ${c.requiredColumns}` : 'No required columns set']
    case 'wait':
      return [`Waiting ${c.seconds}s${Number(c.seconds) > 10 ? ' (shortened to 10s in mock mode)' : ''}`]
    default:
      return []
  }
}

function successLogs(node: WorkflowNode): string[] {
  const c = node.data.config
  const rows = 1000 + Math.floor(Math.random() * 50000)
  switch (node.data.toolType) {
    case 'ftp':
      return [c.action === 'upload' ? 'Uploaded 1 file' : `Downloaded 1 file to ${c.localPath || './'}`]
    case 'run_sql':
      return [`${rows.toLocaleString()} rows affected`]
    case 'postgres':
      return [`PostgreSQL ${c.operation || 'query'} completed (${rows.toLocaleString()} rows)`]
    case 'mongodb':
      return [`MongoDB ${c.operation || 'find'} on "${c.collection}" completed (${rows.toLocaleString()} documents)`]
    case 'convert_excel':
      return [`Wrote ${c.outputFile || 'output file'} (${rows.toLocaleString()} rows)`]
    case 'move_file':
      return ['1 file moved']
    case 'api_call':
      return [`Response ${c.expectedStatus || 200} OK`]
    case 'process_file':
      return [`${rows.toLocaleString()} rows valid${c.filter ? `, filter "${c.filter}" applied` : ''}`]
    case 'wait':
      return ['Done waiting']
    default:
      return ['Done']
  }
}

// Resume runs that were in progress when the page was reloaded.
for (const run of runs.filter((r) => r.status === 'running')) {
  for (const task of Object.values(run.tasks)) {
    if (task.status === 'running' || task.status === 'retrying') {
      task.status = 'pending'
      task.attempt = Math.max(0, task.attempt - 1)
      log(task, 'WARN', 'Page reloaded; restarting this attempt.')
    }
  }
  scheduleStarts(run)
  setTimeout(() => advance(run.id), 0)
}

// ---------- API ----------
const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(clone(value)), 60))

export const mockApi: Api = {
  listTools: () => delay(TOOLS),

  listWorkflows: () => delay([...workflows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),

  async getWorkflow(id) {
    const wf = workflows.find((w) => w.id === id)
    if (!wf) throw new Error('Workflow not found')
    return delay(wf)
  },

  async createWorkflow(input: WorkflowInput) {
    const wf: Workflow = { ...clone(input), id: uid(), createdAt: now(), updatedAt: now() }
    workflows.push(wf)
    persistWorkflows()
    return delay(wf)
  },

  async updateWorkflow(id, input) {
    const wf = workflows.find((w) => w.id === id)
    if (!wf) throw new Error('Workflow not found')
    Object.assign(wf, clone(input), { updatedAt: now() })
    persistWorkflows()
    return delay(wf)
  },

  async deleteWorkflow(id) {
    workflows = workflows.filter((w) => w.id !== id)
    persistWorkflows()
    await delay(null)
  },

  async startRun(workflowId, mode: StartMode = 'now') {
    const wf = workflows.find((w) => w.id === workflowId)
    if (!wf) throw new Error('Workflow not found')
    const scheduled = mode === 'test-schedule'
    if (scheduled && !isScheduled(wf.cycle)) throw new Error('This workflow has no schedule yet. Pick one (for example "Every day") first.')

    const starts = startNodeIds(wf.nodes, wf.edges)
    const today = new Date()
    const tasks: Record<string, TaskRun> = {}
    for (const n of wf.nodes) {
      const task: TaskRun = { nodeId: n.id, status: 'pending', attempt: 0, maxAttempts: n.data.retries + 1, startedAt: null, endedAt: null, error: null, logs: [] }
      if (scheduled && starts.has(n.id)) {
        if (!isValidTime(n.data.startTime)) throw new Error(`"${n.data.label}" is a start node but has no start time.`)
        task.status = 'scheduled'
        task.scheduledAt = atTime(today, n.data.startTime).toISOString()
        log(task, 'INFO', `Waiting until ${formatClock(n.data.startTime)}.`)
      }
      tasks[n.id] = task
    }
    const run: Run = {
      id: uid(),
      number: 1000 + runs.length + 1,
      workflowId,
      workflowName: wf.name,
      status: 'running',
      trigger: scheduled ? 'test' : 'manual',
      cycleKey: scheduled ? cycleKeyFor(today) : null,
      deadlineAt: scheduled ? atTime(today, wf.cycle.deadline).toISOString() : null,
      startedAt: now(),
      endedAt: null,
      nodes: clone(wf.nodes),
      edges: clone(wf.edges),
      tasks,
    }
    runs.unshift(run)
    if (scheduled) scheduleStarts(run)
    advance(run.id)
    return delay(run)
  },

  listRuns: (workflowId) => delay(workflowId ? runs.filter((r) => r.workflowId === workflowId) : runs),

  async getRun(id) {
    return delay(findRun(id))
  },

  async cancelRun(id) {
    const run = findRun(id)
    if (run.status === 'running') {
      clearTimeout(timers.get(timerKey(id, DEADLINE)))
      timers.delete(timerKey(id, DEADLINE))
      for (const task of Object.values(run.tasks)) {
        clearTimeout(timers.get(timerKey(id, task.nodeId)))
        timers.delete(timerKey(id, task.nodeId))
        if (!isTerminal(task.status)) {
          task.status = 'cancelled'
          task.endedAt = now()
          log(task, 'WARN', 'Cancelled by user.')
        }
      }
      run.status = 'cancelled'
      run.endedAt = now()
      persistRuns()
    }
    return delay(run)
  },

  /** Re-runs one failed, cancelled or missed task and whatever was waiting on it. Completed tasks are not run again. */
  async retryTask(runId, nodeId) {
    const run = findRun(runId)
    const task = run.tasks[nodeId]
    if (task.status !== 'failed' && task.status !== 'cancelled' && task.status !== 'missed') {
      throw new Error('Only failed, cancelled or missed tasks can be retried.')
    }

    const downstream = new Set<string>()
    const walk = (id: string) => {
      for (const e of run.edges.filter((e) => e.source === id)) {
        if (!downstream.has(e.target)) {
          downstream.add(e.target)
          walk(e.target)
        }
      }
    }
    walk(nodeId)

    const reset = (t: TaskRun) => {
      t.status = 'pending'
      t.attempt = 0
      t.startedAt = null
      t.endedAt = null
      t.error = null
    }
    reset(task)
    log(task, 'INFO', 'Manual retry requested.')
    for (const id of downstream) {
      const t = run.tasks[id]
      if (t.status === 'skipped' || t.status === 'cancelled') reset(t)
    }
    // Other tasks cancelled along with the run also get another chance.
    for (const t of Object.values(run.tasks)) if (t.status === 'cancelled') reset(t)

    run.status = 'running'
    run.endedAt = null
    advance(runId)
    return delay(run)
  },

  async startTaskNow(runId, nodeId) {
    const run = findRun(runId)
    if (run.status !== 'running' || run.tasks[nodeId]?.status !== 'scheduled') {
      throw new Error('Only start nodes still waiting for their start time can be started now.')
    }
    clearTimeout(timers.get(timerKey(runId, nodeId)))
    fireStart(runId, nodeId, true)
    return delay(run)
  },
}
