import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { ChevronLeft, Clock, PlayCircle, RotateCcw, Square, Terminal, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../components/Feedback'
import { StatusBadge } from '../components/StatusBadge'
import { CanvasContext, TaskNode } from '../components/TaskNode'
import { ToolIcon } from '../components/ToolIcon'
import { durationBetween, formatDateTime, formatDuration, formatTime } from '../lib/format'
import { formatClockFromIso, formatCycleKey } from '../lib/schedule'
import { getTool } from '../tools/registry'
import type { Run, TaskRun } from '../types'
import { toFlowEdges, toFlowNodes } from './BuilderPage'

const nodeTypes = { task: TaskNode }

export function RunDetailPage() {
  const { id } = useParams()
  const [run, setRun] = useState<Run | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const toast = useToast()

  const refresh = useCallback(() => {
    if (!id) return
    api.getRun(id).then(setRun, (e) => setError(String(e.message ?? e)))
  }, [id])

  useEffect(refresh, [refresh])

  // Poll while the run is active; also re-render every second so durations count up.
  const active = run?.status === 'running'
  useEffect(() => {
    if (!active) return
    const poll = setInterval(refresh, 1000)
    const clock = setInterval(() => setTick((t) => t + 1), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [active, refresh])

  const flowNodes = useMemo(
    () => (run ? toFlowNodes(run.nodes).map((n) => ({ ...n, draggable: false, selected: n.id === selectedId })) : []),
    [run, selectedId],
  )
  // Start nodes of scheduled / test runs show their start time on the graph.
  const startBadges = useMemo(() => {
    if (!run) return undefined
    const badges: Record<string, string> = {}
    for (const t of Object.values(run.tasks)) if (t.scheduledAt) badges[t.nodeId] = formatClockFromIso(t.scheduledAt)
    return Object.keys(badges).length ? badges : undefined
  }, [run])

  const flowEdges = useMemo(
    () =>
      run
        ? toFlowEdges(run.edges).map((e) => ({
            ...e,
            animated: run.tasks[e.target]?.status === 'running' || run.tasks[e.target]?.status === 'retrying',
          }))
        : [],
    [run],
  )

  if (error) return <div className="p-8 text-sm text-rose-400">Could not load execution: {error}</div>
  if (!run) return <div className="p-8 text-sm text-[#8f96a8]">Loading execution…</div>

  const parentsOf = (nodeId: string) =>
    run.edges.filter((e) => e.target === nodeId).map((e) => run.nodes.find((n) => n.id === e.source)?.data.label ?? e.source)
  const selectedNode = run.nodes.find((n) => n.id === selectedId)
  const selectedTask = selectedId ? run.tasks[selectedId] : null
  const failedTask = Object.values(run.tasks).find((t) => t.status === 'failed' || t.status === 'missed')
  const canRetry = (t: TaskRun) => t.status === 'failed' || t.status === 'cancelled' || t.status === 'missed'
  const waitingStarts = Object.values(run.tasks).filter((t) => t.status === 'scheduled')

  const act = async (fn: () => Promise<Run>) => {
    try {
      setRun(await fn())
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="flex h-full bg-[#18191e]">
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <Link to="/runs" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-[#8f96a8] hover:text-white">
          <ChevronLeft size={15} /> All executions
        </Link>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-xl font-semibold text-white">
              <span className="font-mono text-base text-[#8f96a8]">#{run.number}</span>
              <Link to={`/workflows/${run.workflowId}`} className="hover:text-[#8fb2f5]">
                {run.workflowName}
              </Link>
            </h1>
            <p className="mt-1 text-xs text-[#8f96a8]">
              {triggerLabel(run)} · {formatDateTime(run.startedAt)} ·{' '}
              {run.status === 'running'
                ? `${formatDuration(durationBetween(run.startedAt, null))} elapsed`
                : `took ${formatDuration(durationBetween(run.startedAt, run.endedAt))}`}
              {run.deadlineAt && ` · deadline ${formatClockFromIso(run.deadlineAt)}`}
            </p>
            {run.status === 'running' && waitingStarts.length > 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-sky-300">
                <Clock size={12} />
                Waiting for{' '}
                {waitingStarts
                  .map((t) => `${run.nodes.find((n) => n.id === t.nodeId)?.data.label ?? t.nodeId} (${formatClockFromIso(t.scheduledAt)})`)
                  .join(', ')}
                {run.trigger === 'test' && <span className="text-[#7f8699]">· test run, 1 hour = 3 seconds</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <StatusBadge status={run.status} />
            {run.status === 'running' && (
              <button
                onClick={() => act(() => api.cancelRun(run.id))}
                className="flex items-center gap-1.5 rounded-lg border border-[#343846] bg-[#252831] px-3 py-1.5 text-xs font-medium text-white hover:border-rose-500/50 hover:bg-rose-500/10"
              >
                <Square size={12} /> Stop execution
              </button>
            )}
            {failedTask && run.status !== 'running' && (
              <button
                onClick={() => act(() => api.retryTask(run.id, failedTask.nodeId))}
                className="flex items-center gap-1.5 rounded-lg bg-[#3d6ccc] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#3d6ccc]/20 hover:bg-[#2f5cb8]"
              >
                <RotateCcw size={13} /> Retry failed node
              </button>
            )}
          </div>
        </div>

        {/* execution dependency graph */}
        <div className="mb-5 h-80 overflow-hidden rounded-xl border border-[#2c2f3b] bg-[#23252c]">
          <ReactFlowProvider>
            <CanvasContext.Provider value={{ tasks: run.tasks, startBadges }}>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                nodesConnectable={false}
                nodesDraggable={false}
                elementsSelectable
                onNodeClick={(_, n) => setSelectedId(n.id)}
                onPaneClick={() => setSelectedId(null)}
                fitView
                fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#3a3f4f" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </CanvasContext.Provider>
          </ReactFlowProvider>
        </div>

        {/* Node execution table */}
        <div className="overflow-hidden rounded-xl border border-[#2c2f3b] bg-[#1f2128]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#2c2f3b] bg-[#252831] text-left text-xs uppercase tracking-wider text-[#7f8699]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Node</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Upstream</th>
                <th className="px-4 py-2.5 font-medium">Starts at</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d38]">
              {run.nodes.map((n) => {
                const t = run.tasks[n.id]
                const parents = parentsOf(n.id)
                const tool = getTool(n.data.toolType)
                return (
                  <tr
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`cursor-pointer transition-colors hover:bg-[#252831] ${
                      selectedId === n.id ? 'bg-[#3d6ccc]/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                          style={{ background: tool?.color ?? '#64748b' }}
                        >
                          <ToolIcon name={tool?.icon ?? ''} size={12} />
                        </span>
                        <span className="font-medium text-white">{n.data.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#8f96a8]">{parents.length ? parents.join(', ') : 'Start node'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-sky-300">
                      {t.scheduledAt ? formatClockFromIso(t.scheduledAt) : <span className="text-[#686f82]">{parents.length ? 'after upstream' : 'immediately'}</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#8f96a8]">{formatTime(t.startedAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#8f96a8]">
                      {t.startedAt ? formatDuration(durationBetween(t.startedAt, t.endedAt)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#8f96a8]">
                      {t.attempt}
                      {t.maxAttempts > 1 && ` / ${t.maxAttempts}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2.5 text-xs text-[#686f82]">Select any node on the canvas or table to inspect its execution logs.</p>
      </div>

      {/* Node execution detail + logs */}
      {selectedNode && selectedTask && (
        <aside className="flex w-[27rem] shrink-0 flex-col border-l border-[#2c2f3b] bg-[#1f2128]">
          <div className="flex items-start justify-between gap-2 border-b border-[#2c2f3b] p-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: getTool(selectedNode.data.toolType)?.color ?? '#64748b' }}
              >
                <ToolIcon name={getTool(selectedNode.data.toolType)?.icon ?? ''} size={17} />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#7f8699]">
                  Run #{run.number} · {getTool(selectedNode.data.toolType)?.name}
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-semibold text-white">
                  {selectedNode.data.label}
                  <StatusBadge status={selectedTask.status} />
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} className="rounded-md p-1 text-[#7f8699] hover:bg-[#2a2d37] hover:text-white" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-3 border-b border-[#2c2f3b] p-4 text-xs">
            {selectedTask.scheduledAt && <Info label="Scheduled for" value={formatClockFromIso(selectedTask.scheduledAt)} />}
            <Info label="Started" value={formatTime(selectedTask.startedAt)} />
            <Info label="Duration" value={formatDuration(durationBetween(selectedTask.startedAt, selectedTask.endedAt))} />
            <Info label="Attempt" value={`${selectedTask.attempt} of ${selectedTask.maxAttempts}`} />
            <Info label="Upstream" value={parentsOf(selectedNode.id).join(', ') || 'None'} />
          </dl>

          {selectedTask.error && (
            <div className="mx-4 mt-4 rounded-lg border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-300">
              {selectedTask.error}
            </div>
          )}

          {selectedTask.status === 'scheduled' && run.status === 'running' && (
            <div className="px-4 pt-4">
              <button
                onClick={() => act(() => api.startTaskNow(run.id, selectedNode.id))}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20"
              >
                <PlayCircle size={13} /> Start now
              </button>
              <p className="mt-1.5 text-[11px] text-[#7f8699]">
                Starts this node now instead of waiting until {formatClockFromIso(selectedTask.scheduledAt)}.
              </p>
            </div>
          )}

          {canRetry(selectedTask) && run.status !== 'running' && (
            <div className="px-4 pt-4">
              <button
                onClick={() => act(() => api.retryTask(run.id, selectedNode.id))}
                className="flex items-center gap-1.5 rounded-lg bg-[#3d6ccc] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2f5cb8]"
              >
                <RotateCcw size={13} /> Retry this node
              </button>
              <p className="mt-1.5 text-[11px] text-[#7f8699]">Previously succeeded nodes will not re-run.</p>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8f96a8]">
              <Terminal size={13} />
              Output Logs {active && <span className="font-normal normal-case text-amber-400">· live</span>}
            </div>
            <div className="flex-1 overflow-y-auto rounded-xl border border-[#2c2f3b] bg-[#131418] p-3 font-mono text-xs leading-relaxed">
              {selectedTask.logs.length === 0 && <div className="text-[#686f82]">No logs recorded yet.</div>}
              {selectedTask.logs.map((l, i) => (
                <div key={i} className={l.level === 'ERROR' ? 'text-rose-400' : l.level === 'WARN' ? 'text-amber-300' : 'text-[#d1d5db]'}>
                  <span className="text-[#686f82]">{formatTime(l.ts)}</span> {l.level.padEnd(5)} {l.message}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

function triggerLabel(run: Run): string {
  if (run.trigger === 'schedule') return `Scheduled run for ${formatCycleKey(run.cycleKey)}`
  if (run.trigger === 'test') return `Schedule test for ${formatCycleKey(run.cycleKey)}`
  return 'Manual execution'
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[#7f8699]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#e4e6eb]">{value}</dd>
    </div>
  )
}
