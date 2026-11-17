import { Clock, GitMerge, Settings2, Sliders, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatClock, isValidTime } from '../lib/schedule'
import { getTool } from '../tools/registry'
import type { ConfigValue, TaskNodeData, ToolField } from '../types'
import { timeInputClass } from './CyclePicker'
import { ToolIcon } from './ToolIcon'

const inputClass =
  'w-full rounded-lg border border-[#343846] bg-[#18191e] px-3 py-2 text-sm text-[#e4e6eb] placeholder-[#686f82] outline-none transition-colors focus:border-[#3d6ccc] focus:ring-2 focus:ring-[#3d6ccc]/20'

/** Where this node sits in the schedule. */
export interface NodeScheduleInfo {
  /** Labels of the nodes pointing into this one. Empty = this is a start node. */
  parents: string[]
  /** True when the workflow runs on a schedule (not manual only). */
  scheduled: boolean
  /** e.g. "Every day" */
  cycleLabel: string
}

interface Props {
  data: TaskNodeData
  schedule: NodeScheduleInfo
  issues: string[]
  onChange: (patch: Partial<TaskNodeData>) => void
  onRemove: () => void
  onClose: () => void
}

/** Right-hand node inspector panel. */
export function ConfigPanel({ data, schedule, issues, onChange, onRemove, onClose }: Props) {
  const [tab, setTab] = useState<'parameters' | 'settings'>('parameters')
  const tool = getTool(data.toolType)
  const setConfig = (key: string, value: ConfigValue) => onChange({ config: { ...data.config, [key]: value } })

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-[#2c2f3b] bg-[#1f2128]">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-[#2c2f3b] p-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: tool?.color ?? '#64748b' }}
        >
          <ToolIcon name={tool?.icon ?? ''} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#7f8699]">{tool?.name ?? data.toolType}</div>
          <div className="truncate text-sm font-semibold text-white">{data.label}</div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-[#7f8699] hover:bg-[#2a2d37] hover:text-white"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Parameters / Settings tabs */}
      <div className="flex border-b border-[#2c2f3b] px-4 pt-2">
        <button
          type="button"
          onClick={() => setTab('parameters')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'parameters'
              ? 'border-[#3d6ccc] text-white'
              : 'border-transparent text-[#8f96a8] hover:text-[#e4e6eb]'
          }`}
        >
          <Sliders size={13} />
          Parameters
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'settings'
              ? 'border-[#3d6ccc] text-white'
              : 'border-transparent text-[#8f96a8] hover:text-[#e4e6eb]'
          }`}
        >
          <Settings2 size={13} />
          Settings
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {issues.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-300">
            {issues.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        {tab === 'parameters' ? (
          <>
            <ScheduleCard data={data} schedule={schedule} onChange={onChange} />

            <Field label="Node name" required>
              <input className={inputClass} value={data.label} onChange={(e) => onChange({ label: e.target.value })} />
            </Field>

            {tool?.fields.map((field) => (
              <ToolFieldInput key={field.key} field={field} value={data.config[field.key]} onChange={(v) => setConfig(field.key, v)} />
            ))}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#2c2f3b] bg-[#252831] p-3 text-xs text-[#8f96a8]">
              Configure automatic retry behavior and execution timeout for this node.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max retries">
                <input
                  type="number"
                  min={0}
                  max={10}
                  className={inputClass}
                  value={data.retries}
                  onChange={(e) => onChange({ retries: clampInt(e.target.value, 0, 10) })}
                />
              </Field>
              <Field label="Wait between tries (s)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={data.retryDelaySec}
                  onChange={(e) => onChange({ retryDelaySec: clampInt(e.target.value, 0, 86400) })}
                />
              </Field>
            </div>
            <Field label="Timeout (seconds)" help="Execution is aborted if this node runs longer than the timeout.">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={data.timeoutSec}
                onChange={(e) => onChange({ timeoutSec: clampInt(e.target.value, 1, 86400) })}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#2c2f3b] p-3">
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <Trash2 size={14} /> Delete node
        </button>
      </div>
    </aside>
  )
}

/** Start nodes pick their start time; other nodes show what they wait for. */
function ScheduleCard({ data, schedule, onChange }: { data: TaskNodeData; schedule: NodeScheduleInfo; onChange: (patch: Partial<TaskNodeData>) => void }) {
  if (schedule.parents.length > 0) {
    return (
      <div className="flex gap-2.5 rounded-lg border border-[#2c2f3b] bg-[#252831] p-3">
        <GitMerge size={15} className="mt-0.5 shrink-0 text-[#8f96a8]" />
        <div className="text-xs leading-relaxed text-[#9aa1b2]">
          <span className="font-medium text-white">Runs after:</span> {schedule.parents.join(', ')}
          {schedule.parents.length > 1 && <div className="text-[11px] text-[#7f8699]">Waits until all of them have succeeded.</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/[0.06] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-200">
        <Clock size={13} /> Start time
      </div>
      <div className="flex items-center gap-2.5">
        <input
          type="time"
          value={data.startTime ?? ''}
          onChange={(e) => onChange({ startTime: e.target.value || undefined })}
          className={timeInputClass}
          aria-label="Start time"
        />
        {isValidTime(data.startTime) && <span className="text-xs text-[#9aa1b2]">{formatClock(data.startTime)}</span>}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#7f8699]">
        {schedule.scheduled ? (
          <>
            This is a start node (no arrows come into it). It starts at this time, <span className="text-[#b5bac9]">{schedule.cycleLabel.toLowerCase()}</span>.
            Other start nodes can have different times.
          </>
        ) : (
          <>The workflow is set to manual only, so this time is not used yet. Pick a schedule in the toolbar to turn it on.</>
        )}
      </p>
    </div>
  )
}

function ToolFieldInput({ field, value, onChange }: { field: ToolField; value: ConfigValue | undefined; onChange: (v: ConfigValue) => void }) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#2c2f3b] bg-[#252831] px-3 py-2.5 text-sm text-[#e4e6eb]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded accent-[#3d6ccc]"
        />
        <span className="text-xs font-medium">{field.label}</span>
      </label>
    )
  }
  const str = value === undefined ? '' : String(value)
  return (
    <Field label={field.label} required={field.required} help={field.help}>
      {field.type === 'select' ? (
        <select className={inputClass} value={str} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o} value={o} className="bg-[#1f2128] text-white">
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={4}
          value={str}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
          value={str}
          placeholder={field.placeholder}
          autoComplete={field.type === 'password' ? 'new-password' : 'off'}
          onChange={(e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        />
      )}
    </Field>
  )
}

function Field({ label, required, help, children }: { label: string; required?: boolean; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">
        {label}
        {required && <span className="text-[#8fb2f5]"> *</span>}
      </span>
      {children}
      {help && <span className="mt-1 block text-[11px] text-[#7f8699]">{help}</span>}
    </label>
  )
}

function clampInt(raw: string, min: number, max: number) {
  const n = Math.round(Number(raw))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}
