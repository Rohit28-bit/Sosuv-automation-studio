import { CalendarClock, ChevronDown, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { browserTimezone, describeCycle, formatClock, isScheduled, isValidTime, nextCycleDay, WEEKDAY_LABELS } from '../lib/schedule'
import type { CycleFrequency, WorkflowCycle } from '../types'

const FREQUENCIES: { id: CycleFrequency; label: string }[] = [
  { id: 'manual', label: 'Manual' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

// Monday first.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const COMMON_TIMEZONES = ['Asia/Kolkata', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Asia/Dubai']

export interface StartTimeSummary {
  label: string
  time?: string
}

export const timeInputClass =
  'rounded-lg border border-[#343846] bg-[#18191e] px-2.5 py-1.5 font-mono text-xs text-white outline-none [color-scheme:dark] focus:border-[#3d6ccc]'

/**
 * Picks how often a workflow runs (its cycle). The time of day is not set here: each start node
 * has its own start time, shown in the list at the bottom.
 */
export function CyclePicker({
  value,
  onChange,
  starts = [],
  align = 'right',
  prefix,
  buttonClassName,
}: {
  value: WorkflowCycle
  onChange: (cycle: WorkflowCycle) => void
  /** Start nodes and their times, earliest first. */
  starts?: StartTimeSummary[]
  align?: 'left' | 'right'
  prefix?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<WorkflowCycle>(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggleOpen = () => {
    setDraft(value)
    setOpen((o) => !o)
  }

  const toggleDay = (d: number) =>
    setDraft((c) => {
      const next = c.weekdays.includes(d) ? c.weekdays.filter((x) => x !== d) : [...c.weekdays, d]
      return { ...c, weekdays: next.length ? next : [d] }
    })

  const apply = () => {
    onChange(draft)
    setOpen(false)
  }

  const timedStarts = starts.filter((s) => isValidTime(s.time))
  const next = nextCycleDay(draft, timedStarts[0]?.time)
  const timezones = Array.from(new Set([draft.timezone, browserTimezone(), ...COMMON_TIMEZONES]))
  const buttonTimes = isScheduled(value) && timedStarts.length > 0 ? ` · ${timedStarts.map((s) => formatClock(s.time)).join(', ')}` : ''

  return (
    <div className="relative" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={toggleOpen}
        className={
          buttonClassName ??
          'flex items-center gap-1.5 rounded-lg border border-[#343846] bg-[#18191e] px-2.5 py-1.5 text-xs font-medium text-[#e4e6eb] transition-colors hover:border-[#3d6ccc]/60 hover:bg-[#252831]'
        }
        title="How often this workflow runs"
      >
        <CalendarClock size={13} className={isScheduled(value) ? 'text-[#8fb2f5]' : 'text-[#7f8699]'} />
        {prefix && <span className="text-[#7f8699]">{prefix}</span>}
        <span className="max-w-[16rem] truncate">
          {describeCycle(value)}
          {buttonTimes}
        </span>
        <ChevronDown size={13} className="text-[#7f8699]" />
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-[22rem] rounded-xl border border-[#343846] bg-[#1f2128] p-4 shadow-2xl shadow-black/60 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-white">Workflow schedule</div>
              <div className="text-[11px] leading-relaxed text-[#7f8699]">
                Choose how often it runs. Each start node has its own start time (click the node to set it).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-[#7f8699] hover:bg-[#2a2d37] hover:text-white"
              aria-label="Close schedule"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-5 gap-1 rounded-lg border border-[#2c2f3b] bg-[#18191e] p-1">
            {FREQUENCIES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDraft((c) => ({ ...c, frequency: f.id }))}
                className={`rounded-md px-1 py-1 text-[11px] font-medium transition-colors ${
                  draft.frequency === f.id ? 'bg-[#2c303c] text-white shadow-sm' : 'text-[#8f96a8] hover:text-[#e4e6eb]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {draft.frequency === 'manual' ? (
            <p className="rounded-lg border border-[#2c2f3b] bg-[#252831] p-3 text-xs leading-relaxed text-[#9aa1b2]">
              Runs only when you click <span className="font-medium text-white">Execute workflow</span>. Start times on nodes are ignored.
            </p>
          ) : (
            <div className="space-y-3 rounded-lg border border-[#2c2f3b] bg-[#252831] p-3">
              {draft.frequency === 'weekly' && (
                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#b5bac9]">On these days</span>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEK_ORDER.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`rounded-md py-1 text-[10px] font-semibold transition-colors ${
                          draft.weekdays.includes(d)
                            ? 'bg-[#3d6ccc] text-white'
                            : 'border border-[#343846] bg-[#18191e] text-[#8f96a8] hover:text-white'
                        }`}
                      >
                        {WEEKDAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {draft.frequency === 'monthly' && (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#b5bac9]">Day of month</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={draft.dayOfMonth}
                    onChange={(e) => setDraft((c) => ({ ...c, dayOfMonth: Math.min(31, Math.max(1, Math.round(Number(e.target.value)) || 1)) }))}
                    className="w-24 rounded-lg border border-[#343846] bg-[#18191e] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#3d6ccc]"
                  />
                  <span className="mt-1 block text-[11px] text-[#7f8699]">Months without this day use their last day.</span>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#b5bac9]">Timezone</span>
                  <select
                    value={draft.timezone}
                    onChange={(e) => setDraft((c) => ({ ...c, timezone: e.target.value }))}
                    className="w-full rounded-lg border border-[#343846] bg-[#18191e] px-2 py-1.5 text-xs text-white outline-none focus:border-[#3d6ccc]"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz} className="bg-[#1f2128]">
                        {tz}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#b5bac9]">Deadline</span>
                  <input
                    type="time"
                    value={draft.deadline}
                    onChange={(e) => setDraft((c) => ({ ...c, deadline: e.target.value }))}
                    className={`w-full ${timeInputClass}`}
                  />
                </label>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7f8699]">
                A start node that hasn't started by the deadline is marked <span className="text-fuchsia-300">missed</span>, nodes after it are
                skipped, and the run fails (failure alerts fire).
              </p>
            </div>
          )}

          {draft.frequency !== 'manual' && (
            <div className="mt-3 rounded-lg border border-[#2c2f3b] p-3">
              <div className="mb-1.5 text-[11px] font-medium text-[#b5bac9]">Start nodes</div>
              {starts.length === 0 ? (
                <div className="text-[11px] text-[#7f8699]">Add a node to the canvas first.</div>
              ) : (
                <ul className="space-y-1">
                  {starts.map((s) => (
                    <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-[#e4e6eb]">{s.label}</span>
                      {isValidTime(s.time) ? (
                        <span className="shrink-0 font-mono text-sky-300">{formatClock(s.time)}</span>
                      ) : (
                        <span className="shrink-0 text-rose-300">no start time</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-[#7f8699]">
              {next ? `Next run: ${next.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Manual trigger only'}
            </span>
            <button
              type="button"
              onClick={apply}
              className="shrink-0 rounded-lg bg-[#3d6ccc] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2f5cb8]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
