import { GripVertical, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { ToolDefinition } from '../types'
import { ToolIcon } from './ToolIcon'

export const TOOL_DRAG_TYPE = 'application/x-orchestrator-tool'

export function ToolPalette({
  tools,
  onAdd,
  onClose,
}: {
  tools: ToolDefinition[]
  onAdd: (type: string) => void
  onClose?: () => void
}) {
  const [query, setQuery] = useState('')
  const visible = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[#2c2f3b] bg-[#1f2128]">
      <div className="border-b border-[#2c2f3b] p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Add nodes</div>
            <div className="text-[11px] text-[#7f8699]">Drag to canvas or click +</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[#7f8699] hover:bg-[#2a2d37] hover:text-white"
              title="Close node panel"
              aria-label="Close node panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-[#343846] bg-[#18191e] px-2.5 py-2 text-sm focus-within:border-[#3d6ccc]">
          <Search size={14} className="text-[#7f8699]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full bg-transparent text-xs text-white placeholder-[#686f82] outline-none"
          />
        </label>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {visible.map((tool) => (
          <div
            key={tool.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TOOL_DRAG_TYPE, tool.type)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDoubleClick={() => onAdd(tool.type)}
            title={tool.description}
            className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-[#2c2f3b] bg-[#252831] p-2.5 transition-all hover:border-[#3d6ccc]/50 hover:bg-[#2a2e39] active:cursor-grabbing"
          >
            <GripVertical size={13} className="shrink-0 text-[#555b6e] group-hover:text-[#8f96a8]" />
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ background: tool.color }}
            >
              <ToolIcon name={tool.icon} size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[#e4e6eb]">{tool.name}</div>
              <div className="truncate text-[11px] text-[#7f8699]">{tool.description}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAdd(tool.type)
              }}
              title={`Add ${tool.name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#2f3340] text-[#9aa1b2] opacity-0 transition-opacity hover:bg-[#3d6ccc] hover:text-white group-hover:opacity-100"
            >
              <Plus size={13} />
            </button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#343846] p-4 text-center text-xs text-[#7f8699]">
            No nodes match "{query}".
          </div>
        )}
      </div>
    </aside>
  )
}
