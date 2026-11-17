import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { createContext, useContext } from 'react'
import { durationBetween, formatDuration } from '../lib/format'
import { formatClockFromIso } from '../lib/schedule'
import { getTool } from '../tools/registry'
import type { TaskNodeData, TaskRun } from '../types'
import { STATUS_STYLES } from './StatusBadge'
import { ToolIcon } from './ToolIcon'

/**
 * Extra info the canvas shows on nodes: validation errors (builder), task status (run view),
 * and start-time badges. startBadges maps a start node's id to its time label, or null if it
 * still needs one.
 */
export const CanvasContext = createContext<{
  errorIds?: Set<string>
  tasks?: Record<string, TaskRun>
  startBadges?: Record<string, string | null>
}>({})

export type TaskFlowNode = Node<TaskNodeData, 'task'>

export function TaskNode({ id, data, selected }: NodeProps<TaskFlowNode>) {
  const { errorIds, tasks, startBadges } = useContext(CanvasContext)
  const hasBadge = !!startBadges && id in startBadges
  const badge = startBadges?.[id]
  const tool = getTool(data.toolType)
  const task = tasks?.[id]
  const hasError = errorIds?.has(id)

  const border = task
    ? STATUS_STYLES[task.status].border
    : hasError
      ? 'border-rose-500 ring-2 ring-rose-500/25'
      : selected
        ? 'border-[#3d6ccc] ring-2 ring-[#3d6ccc]/30'
        : 'border-[#3a3e4d] hover:border-[#52586c]'

  const bg =
    task?.status === 'completed'
      ? 'bg-[#212b28]'
      : task?.status === 'failed'
        ? 'bg-[#2c2226]'
        : task?.status === 'running'
          ? 'bg-[#2b2821]'
          : task?.status === 'scheduled'
            ? 'bg-[#212833]'
            : 'bg-[#282b34]'

  return (
    <div
      title={data.label}
      className={`group relative w-max min-w-[120px] max-w-[300px] rounded-xl border-2 ${border} ${bg} shadow-lg shadow-black/30 transition-all duration-150`}
    >
      {hasBadge && (
        <div
          className={`absolute -top-2.5 left-2.5 flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-semibold leading-4 shadow ${
            badge ? 'border-sky-500/50 bg-[#1b2633] text-sky-300' : 'border-rose-500/50 bg-[#2c1f24] text-rose-300'
          }`}
        >
          <Clock size={10} />
          {badge ?? 'Set start time'}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="!-left-[7px] !h-3.5 !w-3.5 !rounded-full !border-2 !border-[#1e2027] !bg-[#7c8499]"
      />

      <div className={`flex items-center gap-2.5 pb-2 pl-2.5 pr-4 ${hasBadge ? 'pt-3' : 'pt-2'}`}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-inner"
          style={{
            background: tool?.color ?? '#64748b',
            boxShadow: `0 4px 12px ${tool?.color ?? '#64748b'}35`,
          }}
        >
          <ToolIcon name={tool?.icon ?? ''} size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{data.label}</div>
          <div className="truncate text-[11px] text-[#8f96a8]">
            {task ? taskSubtitle(task) : tool?.name ?? data.toolType}
          </div>
        </div>
      </div>

      {/* corner execution status indicator */}
      {task?.status === 'completed' && (
        <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <CheckCircle2 size={13} />
        </div>
      )}
      {task?.status === 'failed' && (
        <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow">
          <AlertCircle size={13} />
        </div>
      )}
      {(task?.status === 'running' || task?.status === 'retrying') && (
        <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow">
          <Loader2 size={12} className="animate-spin" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!-right-[7px] !h-3.5 !w-3.5 !rounded-full !border-2 !border-[#1e2027] !bg-[#7c8499]"
      />
    </div>
  )
}

function taskSubtitle(task: TaskRun) {
  const label = STATUS_STYLES[task.status].label
  if (task.status === 'scheduled') return `${label} · ${formatClockFromIso(task.scheduledAt)}`
  if (task.status === 'pending' || task.status === 'skipped' || task.status === 'missed') return label
  const attempts = task.maxAttempts > 1 ? ` · try ${task.attempt}/${task.maxAttempts}` : ''
  return `${label} · ${formatDuration(durationBetween(task.startedAt, task.endedAt))}${attempts}`
}
