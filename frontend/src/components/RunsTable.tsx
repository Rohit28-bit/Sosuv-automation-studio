import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { durationBetween, formatDateTime, formatDuration } from '../lib/format'
import { formatCycleKey } from '../lib/schedule'
import type { Run } from '../types'
import { StatusBadge } from './StatusBadge'

export function RunsTable({ runs, empty = 'No executions yet.' }: { runs: Run[]; empty?: string }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#343846] bg-[#1f2128] p-10 text-center text-sm text-[#8f96a8]">
        {empty}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#2c2f3b] bg-[#1f2128]">
      <table className="w-full text-sm">
        <thead className="border-b border-[#2c2f3b] bg-[#252831] text-left text-xs uppercase tracking-wider text-[#7f8699]">
          <tr>
            <th className="px-4 py-3 font-medium">Execution</th>
            <th className="px-4 py-3 font-medium">Workflow</th>
            <th className="px-4 py-3 font-medium">Trigger</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Started</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2d38]">
          {runs.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-[#252831]">
              <td className="px-4 py-3 font-mono text-xs text-[#8f96a8]">#{r.number}</td>
              <td className="px-4 py-3 font-medium text-white">
                <Link to={`/runs/${r.id}`} className="hover:text-[#8fb2f5]">
                  {r.workflowName}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-[#9aa1b2]">
                {r.trigger === 'schedule' ? 'Scheduled' : r.trigger === 'test' ? 'Schedule test' : 'Manual'}
                {r.cycleKey && <span className="block text-[11px] text-[#686f82]">{formatCycleKey(r.cycleKey)}</span>}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-xs text-[#9aa1b2]">{formatDateTime(r.startedAt)}</td>
              <td className="px-4 py-3 font-mono text-xs text-[#9aa1b2]">
                {formatDuration(durationBetween(r.startedAt, r.endedAt))}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/runs/${r.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#343846] bg-[#252831] px-2.5 py-1 text-xs font-medium text-[#e4e6eb] transition-colors hover:border-[#3d6ccc]/60 hover:text-white"
                >
                  Inspect <ArrowUpRight size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
