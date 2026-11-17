import { CalendarClock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { atTime, cycleKeyFor, formatClock, formatCycleKey, isScheduled, isValidTime, runsOn, startSchedule } from '../lib/schedule'
import type { Run, TaskStatus, Workflow } from '../types'
import { StatusBadge } from './StatusBadge'
import { ToolIcon } from './ToolIcon'
import { getTool } from '../tools/registry'

interface Row {
  at: Date
  time: string
  workflow: Workflow
  nodeId: string
  label: string
  toolType: string
  run?: Run
  status?: TaskStatus
}

/** Every start node due today across active workflows, in time order, with live status. */
export function TodaySchedule({ workflows, runs }: { workflows: Workflow[]; runs: Run[] }) {
  // Re-render every minute so "upcoming" / "now" stay correct.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const todayKey = cycleKeyFor(now)
  const rows: Row[] = []
  for (const wf of workflows) {
    if (!wf.enabled || !isScheduled(wf.cycle) || !runsOn(wf.cycle, now)) continue
    // Runs are newest first, so this is today's latest run of this workflow.
    const run = runs.find((r) => r.workflowId === wf.id && r.cycleKey === todayKey)
    for (const s of startSchedule(wf.nodes, wf.edges)) {
      if (!isValidTime(s.time)) continue
      const node = wf.nodes.find((n) => n.id === s.id)!
      rows.push({
        at: atTime(now, s.time),
        time: s.time,
        workflow: wf,
        nodeId: s.id,
        label: s.label,
        toolType: node.data.toolType,
        run,
        status: run?.tasks[s.id]?.status,
      })
    }
  }
  rows.sort((a, b) => a.at.getTime() - b.at.getTime() || a.workflow.name.localeCompare(b.workflow.name))
  const nextIndex = rows.findIndex((r) => r.at > now)

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-[#2c2f3b] bg-[#1f2128]">
      <header className="flex items-center justify-between gap-3 border-b border-[#2c2f3b] px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={15} className="text-[#8fb2f5]" />
          <h2 className="text-sm font-semibold text-white">Today's schedule</h2>
          <span className="text-xs text-[#7f8699]">{formatCycleKey(todayKey)}</span>
        </div>
        {rows.length > 0 && (
          <span className="text-xs text-[#7f8699]">
            {rows.length} start{rows.length === 1 ? '' : 's'} · {new Set(rows.map((r) => r.workflow.id)).size} workflow
            {new Set(rows.map((r) => r.workflow.id)).size === 1 ? '' : 's'}
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs leading-relaxed text-[#8f96a8]">
          Nothing is scheduled for today. Open a workflow, pick a schedule in the toolbar, and give its start nodes a start time.
        </p>
      ) : (
        <ol className="divide-y divide-[#2a2d38]">
          {rows.map((r, i) => {
            const tool = getTool(r.toolType)
            const past = r.at <= now
            return (
              <li key={`${r.workflow.id}:${r.nodeId}`}>
                {i === nextIndex && (
                  <div className="flex items-center gap-2 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8fb2f5]">
                    <span className="h-px flex-1 bg-[#3d6ccc]/50" />
                    Now · {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    <span className="h-px flex-1 bg-[#3d6ccc]/50" />
                  </div>
                )}
                <div className={`flex items-center gap-3 px-4 py-2.5 ${i === nextIndex ? 'bg-[#3d6ccc]/[0.07]' : ''}`}>
                  <span className={`w-[4.5rem] shrink-0 font-mono text-xs ${past ? 'text-[#7f8699]' : 'text-sky-300'}`}>{formatClock(r.time)}</span>
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                    style={{ background: tool?.color ?? '#64748b' }}
                  >
                    <ToolIcon name={tool?.icon ?? ''} size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{r.label}</div>
                    <Link to={`/workflows/${r.workflow.id}`} className="truncate text-[11px] text-[#7f8699] hover:text-[#8fb2f5]">
                      {r.workflow.name}
                    </Link>
                  </div>
                  {r.run && r.status ? (
                    <Link to={`/runs/${r.run.id}`} title={`Open run #${r.run.number}`}>
                      <StatusBadge status={r.status} />
                    </Link>
                  ) : (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        past ? 'border-[#3a3e4d] text-[#7f8699]' : 'border-sky-500/30 text-sky-300'
                      }`}
                    >
                      {past ? 'No run yet' : i === nextIndex ? 'Next up' : 'Upcoming'}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
