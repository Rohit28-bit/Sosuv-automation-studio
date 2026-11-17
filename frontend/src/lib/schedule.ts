/**
 * Scheduling rules shared by the editor, the run view and the mock backend.
 *
 * The model:
 *  - A workflow has one cycle (how often it runs: daily, weekdays, …).
 *  - Each start node (a node with no incoming arrows) has its own start time inside that cycle.
 *  - One run is created per cycle. Start nodes wait until their time; every other node runs
 *    as soon as all the nodes pointing into it have finished.
 */
import type { WorkflowCycle, WorkflowEdge, WorkflowNode } from '../types'

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const browserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const DEFAULT_CYCLE: WorkflowCycle = {
  frequency: 'manual',
  weekdays: [1],
  dayOfMonth: 1,
  timezone: browserTimezone(),
  deadline: '23:59',
}

export const isScheduled = (cycle: WorkflowCycle | undefined) => !!cycle && cycle.frequency !== 'manual'

/** Nodes with no incoming arrows. These are the ones that get a start time. */
export function startNodeIds(nodes: Pick<WorkflowNode, 'id'>[], edges: Pick<WorkflowEdge, 'target'>[]): Set<string> {
  const targets = new Set(edges.map((e) => e.target))
  return new Set(nodes.filter((n) => !targets.has(n.id)).map((n) => n.id))
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const isValidTime = (hhmm: string | undefined): hhmm is string => !!hhmm && TIME_RE.test(hhmm)

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** "07:00" → "7:00 AM" */
export function formatClock(hhmm: string | undefined): string {
  if (!isValidTime(hhmm)) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** ISO timestamp → "7:00 AM" in the viewer's local time. */
export function formatClockFromIso(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Local calendar date as "YYYY-MM-DD" (the cycle key). */
export function cycleKeyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** "2026-11-16" → "Mon, 16 Nov" */
export function formatCycleKey(key: string | null | undefined): string {
  if (!key) return '—'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

/** The given day at HH:MM local time. */
export function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

/** Does the cycle include this calendar day? */
export function runsOn(cycle: WorkflowCycle, day: Date): boolean {
  switch (cycle.frequency) {
    case 'manual':
      return false
    case 'daily':
      return true
    case 'weekdays':
      return day.getDay() >= 1 && day.getDay() <= 5
    case 'weekly':
      return cycle.weekdays.includes(day.getDay())
    case 'monthly': {
      const lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate()
      return day.getDate() === Math.min(cycle.dayOfMonth, lastDay)
    }
  }
}

/**
 * The next day the cycle runs, counting today only if `earliestStart` (HH:MM) has not passed yet.
 * Returns null for manual workflows.
 */
export function nextCycleDay(cycle: WorkflowCycle, earliestStart: string | undefined, from = new Date()): Date | null {
  if (!isScheduled(cycle)) return null
  const day = new Date(from)
  day.setHours(0, 0, 0, 0)
  const todayStillAhead = isValidTime(earliestStart) ? atTime(day, earliestStart) > from : false
  if (!todayStillAhead) day.setDate(day.getDate() + 1)
  for (let i = 0; i < 400; i++) {
    if (runsOn(cycle, day)) return day
    day.setDate(day.getDate() + 1)
  }
  return null
}

export function describeCycle(cycle: WorkflowCycle | undefined): string {
  if (!cycle) return 'Manual only'
  switch (cycle.frequency) {
    case 'manual':
      return 'Manual only'
    case 'daily':
      return 'Every day'
    case 'weekdays':
      return 'Weekdays (Mon–Fri)'
    case 'weekly': {
      const days = [...cycle.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_LABELS[d])
      return `Weekly (${days.join(', ')})`
    }
    case 'monthly':
      return `Monthly (day ${cycle.dayOfMonth})`
  }
}

/** Start nodes of a workflow with their start times, earliest first (nodes without a time last). */
export function startSchedule(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const ids = startNodeIds(nodes, edges)
  return nodes
    .filter((n) => ids.has(n.id))
    .map((n) => ({ id: n.id, label: n.data.label, time: n.data.startTime }))
    .sort((a, b) => (isValidTime(a.time) ? timeToMinutes(a.time) : 9999) - (isValidTime(b.time) ? timeToMinutes(b.time) : 9999))
}

/**
 * Converts the old single cron schedule ("m h dom mon dow") into a cycle plus one start time.
 * Used to upgrade workflows saved before start nodes had their own times.
 */
export function cycleFromLegacyCron(cron: string | undefined): { cycle: WorkflowCycle; startTime?: string } {
  const parts = (cron ?? '').trim().split(/\s+/)
  if (parts.length !== 5) return { cycle: { ...DEFAULT_CYCLE } }
  const [min, hour, dom, mon, dow] = parts
  if (!/^\d+$/.test(min) || !/^\d+$/.test(hour) || mon !== '*') return { cycle: { ...DEFAULT_CYCLE } }
  const startTime = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  if (!isValidTime(startTime)) return { cycle: { ...DEFAULT_CYCLE } }

  if (dom === '*' && dow === '*') return { cycle: { ...DEFAULT_CYCLE, frequency: 'daily' }, startTime }
  if (dom === '*' && (dow === '1-5' || dow === '1,2,3,4,5')) return { cycle: { ...DEFAULT_CYCLE, frequency: 'weekdays' }, startTime }
  if (dom === '*' && /^[0-6](,[0-6])*$/.test(dow)) {
    return { cycle: { ...DEFAULT_CYCLE, frequency: 'weekly', weekdays: dow.split(',').map(Number) }, startTime }
  }
  if (/^\d+$/.test(dom) && dow === '*') {
    return { cycle: { ...DEFAULT_CYCLE, frequency: 'monthly', dayOfMonth: Math.min(31, Math.max(1, Number(dom))) }, startTime }
  }
  return { cycle: { ...DEFAULT_CYCLE } }
}
