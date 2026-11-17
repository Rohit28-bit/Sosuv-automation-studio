import { Activity, AlertCircle, Bell, CheckCircle2, Pencil, Play, Plus, Search, Trash2, Workflow as WorkflowIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useConfirm, useToast } from '../components/Feedback'
import { PageHeader } from '../components/Layout'
import { RunsTable } from '../components/RunsTable'
import { CyclePicker } from '../components/CyclePicker'
import { StatusBadge } from '../components/StatusBadge'
import { TodaySchedule } from '../components/TodaySchedule'
import { ToolIcon } from '../components/ToolIcon'
import { formatDateTime } from '../lib/format'
import { DEFAULT_CYCLE, startSchedule } from '../lib/schedule'
import { validateWorkflow } from '../lib/validate'
import { getTool, TOOLS } from '../tools/registry'
import type { Run, Workflow, WorkflowCycle } from '../types'

/** Loads data and, if any run is active, refreshes it every 2 seconds. */
function useWorkflowsAndRuns() {
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const reload = useCallback(() => {
    api.listWorkflows().then(setWorkflows)
    api.listRuns().then(setRuns)
  }, [])
  useEffect(reload, [reload])
  const anyRunning = runs.some((r) => r.status === 'running')
  useEffect(() => {
    if (!anyRunning) return
    const t = setInterval(reload, 2000)
    return () => clearInterval(t)
  }, [anyRunning, reload])
  return { workflows, runs, reload }
}

export function DashboardPage() {
  const { workflows, runs } = useWorkflowsAndRuns()
  const [today] = useState(() => new Date().toDateString())
  const todays = runs.filter((r) => new Date(r.startedAt).toDateString() === today)
  const stats = [
    { label: 'Total Workflows', value: workflows?.length ?? '—', icon: WorkflowIcon, accent: 'text-[#8fb2f5] bg-[#3d6ccc]/10' },
    { label: 'Succeeded Today', value: todays.filter((r) => r.status === 'completed').length, icon: CheckCircle2, accent: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Failed Today', value: todays.filter((r) => r.status === 'failed').length, icon: AlertCircle, accent: 'text-rose-400 bg-rose-500/10', tone: 'text-rose-400' },
    { label: 'Running Now', value: runs.filter((r) => r.status === 'running').length, icon: Activity, accent: 'text-amber-400 bg-amber-500/10', tone: 'text-amber-400' },
  ]
  return (
    <div className="mx-auto max-w-6xl p-7">
      <PageHeader
        title="Overview"
        subtitle="Monitor workflow executions, active automations, and recent runs."
        actions={
          <Link
            to="/workflows/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#3d6ccc] px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-[#3d6ccc]/20 hover:bg-[#2f5cb8]"
          >
            <Plus size={16} /> New Workflow
          </Link>
        }
      />
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border border-[#2c2f3b] bg-[#1f2128] p-4 transition-colors hover:border-[#3a3e4d]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8f96a8]">{s.label}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.accent}`}>
                  <Icon size={15} />
                </span>
              </div>
              <div className={`mt-2 text-3xl font-semibold tracking-tight ${s.value && s.tone ? s.tone : 'text-white'}`}>{s.value}</div>
            </div>
          )
        })}
      </div>
      {workflows && <TodaySchedule workflows={workflows} runs={runs} />}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8f96a8]">Recent Executions</h2>
        <Link to="/runs" className="text-xs font-medium text-[#8fb2f5] hover:underline">
          View all executions
        </Link>
      </div>
      <RunsTable runs={runs.slice(0, 10)} empty="No executions yet. Open a workflow and click Execute workflow." />
    </div>
  )
}

export function WorkflowsPage() {
  const { workflows, runs, reload } = useWorkflowsAndRuns()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const toast = useToast()
  const confirm = useConfirm()

  const lastRun = (id: string) => runs.find((r) => r.workflowId === id)

  const toggle = async (wf: Workflow) => {
    await api.updateWorkflow(wf.id, { enabled: !wf.enabled })
    reload()
  }
  const updateCycle = async (wf: Workflow, cycle: WorkflowCycle) => {
    // Start times live on the nodes, so a new schedule can leave a start node without one.
    const problem = validateWorkflow(wf.nodes, wf.edges, cycle)[0]
    if (problem) {
      toast(`Schedule not saved. ${problem.message} Open the workflow to fix it.`, 'error')
      return
    }
    await api.updateWorkflow(wf.id, { cycle })
    reload()
    toast(`Updated schedule for "${wf.name}"`, 'success')
  }
  const remove = async (wf: Workflow) => {
    const ok = await confirm({
      title: `Delete "${wf.name}"?`,
      message: 'The workflow and its schedule are removed. Its execution history is kept.',
      confirmLabel: 'Delete workflow',
      danger: true,
    })
    if (!ok) return
    await api.deleteWorkflow(wf.id)
    reload()
    toast(`Deleted "${wf.name}"`, 'success')
  }
  const run = async (wf: Workflow) => {
    try {
      const r = await api.startRun(wf.id)
      navigate(`/runs/${r.id}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const filtered = (workflows ?? []).filter((wf) => {
    if (filter === 'active' && !wf.enabled) return false
    if (filter === 'inactive' && wf.enabled) return false
    if (query && !wf.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  return (
    <div className="mx-auto max-w-6xl p-7">
      <PageHeader
        title="Workflows"
        subtitle="Create, schedule, and automate multi-step workflows."
        actions={
          <Link
            to="/workflows/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#3d6ccc] px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-[#3d6ccc]/20 hover:bg-[#2f5cb8]"
          >
            <Plus size={16} /> New Workflow
          </Link>
        }
      />

      {/* Filter & search bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex w-72 items-center gap-2 rounded-lg border border-[#343846] bg-[#1f2128] px-3 py-2 text-sm focus-within:border-[#3d6ccc]">
          <Search size={14} className="text-[#7f8699]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows..."
            className="w-full bg-transparent text-xs text-white placeholder-[#686f82] outline-none"
          />
        </label>
        <div className="flex rounded-lg border border-[#2c2f3b] bg-[#1f2128] p-0.5 text-xs">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                filter === f ? 'bg-[#2c303c] text-white' : 'text-[#8f96a8] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {workflows === null ? (
        <p className="text-sm text-[#8f96a8]">Loading workflows…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#343846] bg-[#1f2128] p-12 text-center text-sm text-[#8f96a8]">
          {workflows.length === 0 ? (
            <>
              No workflows yet.{' '}
              <Link to="/workflows/new" className="text-[#8fb2f5] hover:underline">
                Create your first workflow
              </Link>
              .
            </>
          ) : (
            'No workflows match your current filter.'
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((wf) => {
            const last = lastRun(wf.id)
            return (
              <div
                key={wf.id}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2c2f3b] bg-[#1f2128] px-5 py-4 transition-all hover:border-[#3f4456] hover:bg-[#242730]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link to={`/workflows/${wf.id}`} className="truncate text-sm font-semibold text-white group-hover:text-[#8fb2f5]">
                      {wf.name}
                    </Link>
                    <CyclePicker
                      value={wf.cycle ?? DEFAULT_CYCLE}
                      starts={startSchedule(wf.nodes, wf.edges)}
                      onChange={(next) => updateCycle(wf, next)}
                      align="left"
                      buttonClassName="inline-flex items-center gap-1.5 rounded-md border border-[#343846] bg-[#18191e] px-2 py-0.5 text-[11px] text-[#9aa1b2] transition-colors hover:border-[#3d6ccc]/60 hover:text-white"
                    />
                    {wf.failureWebhook?.enabled && (
                      <span
                        title={`Failure alerts enabled (${wf.failureWebhook.provider === 'teams' ? 'MS Teams' : wf.failureWebhook.provider === 'slack' ? 'Slack' : 'Webhook'})`}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                      >
                        <Bell size={10} />
                        {wf.failureWebhook.provider === 'teams'
                          ? 'MS Teams'
                          : wf.failureWebhook.provider === 'slack'
                            ? 'Slack'
                            : 'Webhook'}
                      </span>
                    )}
                  </div>
                  {wf.description && <div className="mt-1 max-w-xl truncate text-xs text-[#7f8699]">{wf.description}</div>}
                </div>

                {/* Node pipeline preview */}
                <div className="flex items-center -space-x-1.5">
                  {wf.nodes.slice(0, 6).map((n) => {
                    const tool = getTool(n.data.toolType)
                    return (
                      <span
                        key={n.id}
                        title={n.data.label}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#1f2128] text-white shadow-sm"
                        style={{ background: tool?.color }}
                      >
                        <ToolIcon name={tool?.icon ?? ''} size={12} />
                      </span>
                    )
                  })}
                  {wf.nodes.length > 6 && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#1f2128] bg-[#2c303c] text-[10px] font-semibold text-[#b5bac9]">
                      +{wf.nodes.length - 6}
                    </span>
                  )}
                </div>

                {/* Last execution */}
                <div className="w-48 text-xs">
                  {last ? (
                    <Link to={`/runs/${last.id}`} className="flex items-center gap-2 text-[#9aa1b2] hover:text-white">
                      <StatusBadge status={last.status} />
                      <span className="truncate">{formatDateTime(last.startedAt)}</span>
                    </Link>
                  ) : (
                    <span className="text-[#686f82]">No runs yet</span>
                  )}
                </div>

                {/* Active toggle & actions */}
                <div className="flex items-center gap-3">
                  <button
                    role="switch"
                    aria-checked={wf.enabled}
                    onClick={() => toggle(wf)}
                    className="flex items-center gap-2 text-xs font-medium"
                    title={wf.enabled ? 'Deactivate workflow' : 'Activate workflow'}
                  >
                    <span className={wf.enabled ? 'text-emerald-400' : 'text-[#686f82]'}>
                      {wf.enabled ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        wf.enabled ? 'bg-emerald-500' : 'bg-[#363a47]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          wf.enabled ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>

                  <div className="flex items-center gap-1 border-l border-[#2c2f3b] pl-3">
                    <Link
                      to={`/workflows/${wf.id}`}
                      title="Edit workflow"
                      className="rounded-lg p-1.5 text-[#9aa1b2] transition-colors hover:bg-[#2c303c] hover:text-white"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => run(wf)}
                      title="Execute workflow"
                      className="rounded-lg p-1.5 text-[#9aa1b2] transition-colors hover:bg-[#3d6ccc]/15 hover:text-[#8fb2f5]"
                    >
                      <Play size={15} />
                    </button>
                    <button
                      onClick={() => remove(wf)}
                      title="Delete workflow"
                      className="rounded-lg p-1.5 text-[#9aa1b2] transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function RunsPage() {
  const { runs } = useWorkflowsAndRuns()
  return (
    <div className="mx-auto max-w-6xl p-7">
      <PageHeader title="Executions" subtitle="Every execution across all workflows, newest first." />
      <RunsTable runs={runs} empty="No executions yet. Open a workflow and click Execute workflow." />
    </div>
  )
}

export function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl p-7">
      <PageHeader title="Nodes" subtitle="Available building blocks. Drag them onto the workflow canvas in the editor." />
      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <div
            key={tool.type}
            className="rounded-xl border border-[#2c2f3b] bg-[#1f2128] p-5 transition-colors hover:border-[#3f4456]"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: tool.color }}
              >
                <ToolIcon name={tool.icon} size={20} />
              </div>
              <div>
                <div className="font-semibold text-white">{tool.name}</div>
                <div className="mt-0.5 text-xs text-[#8f96a8]">{tool.description}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tool.fields.map((f) => (
                <span key={f.key} className="rounded-md border border-[#343846] bg-[#18191e] px-2 py-0.5 text-[11px] text-[#b5bac9]">
                  {f.label}
                  {f.required && <span className="text-[#8fb2f5]">*</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
