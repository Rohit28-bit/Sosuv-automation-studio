import type { RunStatus, TaskStatus } from '../types'

export const STATUS_STYLES: Record<TaskStatus | RunStatus, { badge: string; dot: string; border: string; ring: string; label: string }> = {
  scheduled: {
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    dot: 'bg-sky-400',
    border: 'border-dashed border-sky-500/70',
    ring: '',
    label: 'Scheduled',
  },
  missed: {
    badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/35',
    dot: 'bg-fuchsia-400',
    border: 'border-fuchsia-500/70',
    ring: '',
    label: 'Missed',
  },
  pending: {
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
    border: 'border-dashed border-[#4b5063]',
    ring: '',
    label: 'Waiting',
  },
  running: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    dot: 'bg-amber-400',
    border: 'border-amber-400/80',
    ring: 'ring-2 ring-amber-500/25',
    label: 'Running',
  },
  retrying: {
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
    dot: 'bg-orange-400',
    border: 'border-orange-400/80',
    ring: 'ring-2 ring-orange-500/25',
    label: 'Retrying',
  },
  completed: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/80',
    ring: 'ring-2 ring-emerald-500/20',
    label: 'Succeeded',
  },
  failed: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    dot: 'bg-rose-400',
    border: 'border-rose-500/80',
    ring: 'ring-2 ring-rose-500/25',
    label: 'Error',
  },
  skipped: {
    badge: 'bg-slate-500/10 text-slate-400 border-slate-600/30',
    dot: 'bg-slate-500',
    border: 'border-[#3a3e4d]',
    ring: '',
    label: 'Skipped',
  },
  cancelled: {
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
    border: 'border-[#4b5063]',
    ring: '',
    label: 'Cancelled',
  },
}

export function StatusBadge({ status }: { status: TaskStatus | RunStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  )
}
