// Shared types. These mirror the JSON the FastAPI backend will send and receive.

export type FieldType = 'text' | 'number' | 'password' | 'select' | 'textarea' | 'checkbox'

export interface ToolField {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  help?: string
  options?: string[] // for select
  default?: string | number | boolean
}

export interface ToolDefinition {
  type: string // unique id, e.g. "run_sql"
  name: string // display name, e.g. "Run SQL"
  description: string
  icon: string // lucide icon name, see components/ToolIcon.tsx
  color: string // accent color for the node
  fields: ToolField[]
}

export type ConfigValue = string | number | boolean
export type TaskConfig = Record<string, ConfigValue>

/** Data stored on each node in the canvas. */
export interface TaskNodeData {
  toolType: string
  label: string
  config: TaskConfig
  retries: number
  retryDelaySec: number
  timeoutSec: number
  /**
   * "HH:MM" in the workflow's timezone. Only used on start nodes (nodes with no
   * incoming arrows) when the workflow has a schedule. Each start node can have its own time.
   */
  startTime?: string
  [key: string]: unknown // required by React Flow's node data type
}

export interface WorkflowNode {
  id: string
  position: { x: number; y: number }
  data: TaskNodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export type WebhookProvider = 'slack' | 'teams' | 'custom'

export interface FailureWebhook {
  enabled: boolean
  provider: WebhookProvider
  webhookUrl: string
  channel?: string
  notifyOn: 'failure' | 'always'
  includeLogs?: boolean
}

/** How often a workflow runs. One run is created per cycle (e.g. per day). */
export type CycleFrequency = 'manual' | 'daily' | 'weekdays' | 'weekly' | 'monthly'

export interface WorkflowCycle {
  frequency: CycleFrequency
  weekdays: number[] // used when frequency is 'weekly'; 0 = Sunday … 6 = Saturday
  dayOfMonth: number // used when frequency is 'monthly'; 1–31 (short months use their last day)
  timezone: string // IANA name, e.g. "Asia/Kolkata"
  /** "HH:MM". Start nodes that have not started by this time are marked missed and the run fails. */
  deadline: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  enabled: boolean
  cycle: WorkflowCycle
  failureWebhook?: FailureWebhook
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

/**
 * scheduled = start node waiting for its start time
 * pending   = waiting for the nodes before it to finish
 * missed    = start node whose time never came before the cycle's deadline
 */
export type TaskStatus = 'scheduled' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying' | 'cancelled' | 'missed'
export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface LogLine {
  ts: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
}

export interface TaskRun {
  nodeId: string
  status: TaskStatus
  attempt: number
  maxAttempts: number
  startedAt: string | null
  endedAt: string | null
  error: string | null
  logs: LogLine[]
  /** When this start node is due (ISO). Only set on start nodes of scheduled / test runs. */
  scheduledAt?: string | null
}

/**
 * manual   = "Execute workflow": every start node starts immediately
 * schedule = created by the scheduler, one per cycle; start nodes wait for their times
 * test     = "Test schedule": like a scheduled run, but the waiting is sped up
 */
export type RunTrigger = 'manual' | 'schedule' | 'test'

export interface Run {
  id: string
  number: number
  workflowId: string
  workflowName: string
  status: RunStatus
  trigger: RunTrigger
  /** The cycle this run belongs to, as "YYYY-MM-DD". Null for manual runs. */
  cycleKey?: string | null
  /** When unstarted start nodes are marked missed (ISO). Null for manual runs. */
  deadlineAt?: string | null
  startedAt: string
  endedAt: string | null
  // Snapshot of the workflow at run time, so later edits don't change old runs.
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  tasks: Record<string, TaskRun>
}
