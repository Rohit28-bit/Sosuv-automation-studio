import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { AlertTriangle, Bell, CheckCircle2, ChevronLeft, FlaskConical, MoreHorizontal, Play, Plus, Save, Settings, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { StartMode } from '../api/types'
import { ConfigPanel } from '../components/ConfigPanel'
import { CyclePicker } from '../components/CyclePicker'
import { useConfirm, useToast } from '../components/Feedback'
import { CanvasContext, TaskNode, type TaskFlowNode } from '../components/TaskNode'
import { TOOL_DRAG_TYPE, ToolPalette } from '../components/ToolPalette'
import { DEFAULT_FAILURE_WEBHOOK, WebhookSettingsSection } from '../components/WebhookSettingsSection'
import { DEFAULT_CYCLE, describeCycle, formatClock, isScheduled, isValidTime, startNodeIds, startSchedule } from '../lib/schedule'
import { validateWorkflow, type ValidationIssue } from '../lib/validate'
import { defaultConfig, getTool, TOOLS } from '../tools/registry'
import type { FailureWebhook, TaskNodeData, Workflow, WorkflowCycle, WorkflowEdge, WorkflowNode } from '../types'

const nodeTypes = { task: TaskNode }
export const edgeStyle = {
  type: 'default',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#646c80' },
  style: { strokeWidth: 2 },
} as const

export const toFlowNodes = (nodes: WorkflowNode[]): TaskFlowNode[] => nodes.map((n) => ({ ...n, type: 'task' }))
export const toFlowEdges = (edges: WorkflowEdge[]): Edge[] => edges.map((e) => ({ ...e, ...edgeStyle }))

export function BuilderPage() {
  const { id } = useParams()
  // The key resets the editor when moving between workflows (or to "new").
  return (
    <ReactFlowProvider key={id ?? 'new'}>
      <Builder />
    </ReactFlowProvider>
  )
}

function Builder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { screenToFlowPosition } = useReactFlow()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [name, setName] = useState('Untitled workflow')
  const [description, setDescription] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [cycle, setCycle] = useState<WorkflowCycle>(DEFAULT_CYCLE)
  const [failureWebhook, setFailureWebhook] = useState<FailureWebhook>(DEFAULT_FAILURE_WEBHOOK)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'alerts'>('general')
  const [nodes, setNodes, onNodesChange] = useNodesState<TaskFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const toast = useToast()
  const confirm = useConfirm()

  // The ref is read by the navigation blocker, which must see "saved" right away
  // (save() navigates to the new workflow's URL in the same tick).
  const dirtyRef = useRef(false)
  const setDirtyNow = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }

  // Load an existing workflow, or start empty for /workflows/new.
  useEffect(() => {
    if (!id) return
    api
      .getWorkflow(id)
      .then((wf) => {
        setWorkflow(wf)
        setName(wf.name)
        setDescription(wf.description ?? '')
        setEnabled(wf.enabled)
        setCycle(wf.cycle ?? DEFAULT_CYCLE)
        setFailureWebhook(wf.failureWebhook ?? DEFAULT_FAILURE_WEBHOOK)
        setNodes(toFlowNodes(wf.nodes))
        setEdges(toFlowEdges(wf.edges))
      })
      .catch((e) => setLoadError(String(e.message ?? e)))
  }, [id, setNodes, setEdges])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Warn before leaving the editor through the app (sidebar, back link) with unsaved changes.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirm({
      title: 'Leave without saving?',
      message: 'This workflow has unsaved changes. If you leave now, they will be lost.',
      confirmLabel: 'Leave without saving',
      cancelLabel: 'Stay',
      danger: true,
    }).then((leave) => (leave ? blocker.proceed() : blocker.reset()))
  }, [blocker, confirm])

  const markDirty = () => {
    setDirtyNow(true)
    setIssues(null)
  }

  const definition = useCallback(
    (): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => ({
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    }),
    [nodes, edges],
  )

  // ---------- adding / connecting / editing nodes ----------
  const addNode = useCallback(
    (toolType: string, position: { x: number; y: number }) => {
      const tool = getTool(toolType)
      if (!tool) return
      const labels = new Set(nodes.map((n) => n.data.label))
      let label = tool.name
      for (let i = 2; labels.has(label); i++) label = `${tool.name} ${i}`
      const node: TaskFlowNode = {
        id: `n-${crypto.randomUUID().slice(0, 8)}`,
        type: 'task',
        position,
        data: { toolType, label, config: defaultConfig(tool), retries: 0, retryDelaySec: 60, timeoutSec: 3600 },
      }
      setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...node, selected: true }])
      setSelectedId(node.id)
      markDirty()
    },
    [nodes, setNodes],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const toolType = e.dataTransfer.getData(TOOL_DRAG_TYPE)
    if (!toolType) return
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(toolType, { x: p.x - 80, y: p.y - 24 })
  }

  const addFromClick = (toolType: string) => {
    const rightmost = nodes.reduce((max, n) => (n.position.x > max.position.x ? n : max), nodes[0])
    // Nodes size to their label now, so place the new one after the rightmost node's actual width.
    const gap = (rightmost?.measured?.width ?? 200) + 80
    addNode(toolType, rightmost ? { x: rightmost.position.x + gap, y: rightmost.position.y } : { x: 0, y: 0 })
  }

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return
      setEdges((es) => (es.some((e) => e.source === c.source && e.target === c.target) ? es : addEdge({ ...c, id: `e-${c.source}-${c.target}`, ...edgeStyle }, es)))
      markDirty()
    },
    [setEdges],
  )

  const updateSelected = (patch: Partial<TaskNodeData>) => {
    setNodes((ns) => ns.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)))
    markDirty()
  }

  const removeSelected = () => {
    setNodes((ns) => ns.filter((n) => n.id !== selectedId))
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
    markDirty()
  }

  // ---------- validate / save / run ----------
  const validate = () => {
    const { nodes: n, edges: e } = definition()
    const found = validateWorkflow(n, e, cycle)
    if (!name.trim()) found.unshift({ message: 'Give the workflow a name.' })
    setIssues(found)
    return found
  }

  const save = async (): Promise<Workflow | null> => {
    if (validate().length > 0) return null
    setBusy(true)
    try {
      const input = {
        name: name.trim(),
        description: description.trim(),
        enabled,
        cycle,
        failureWebhook,
        ...definition(),
      }
      const saved = workflow ? await api.updateWorkflow(workflow.id, input) : await api.createWorkflow(input)
      setWorkflow(saved)
      setDirtyNow(false)
      toast('Workflow saved', 'success')
      if (!workflow) navigate(`/workflows/${saved.id}`, { replace: true })
      return saved
    } catch (e) {
      toast(`Save failed: ${(e as Error).message}`, 'error')
      return null
    } finally {
      setBusy(false)
    }
  }

  const run = async (mode: StartMode = 'now') => {
    const saved = dirty || !workflow ? await save() : workflow
    if (!saved) return
    try {
      const r = await api.startRun(saved.id, mode)
      navigate(`/runs/${r.id}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const changeCycle = (next: WorkflowCycle) => {
    setCycle(next)
    markDirty()
  }

  const errorIds = useMemo(() => new Set((issues ?? []).flatMap((i) => (i.nodeId ? [i.nodeId] : []))), [issues])
  const selected = nodes.find((n) => n.id === selectedId)

  // ---------- schedule info for the canvas, the toolbar and the side panel ----------
  const scheduled = isScheduled(cycle)
  const startIds = useMemo(() => startNodeIds(nodes, edges), [nodes, edges])
  const starts = useMemo(() => startSchedule(nodes, edges), [nodes, edges])
  const startBadges = useMemo(() => {
    if (!scheduled) return undefined
    const badges: Record<string, string | null> = {}
    for (const n of nodes) if (startIds.has(n.id)) badges[n.id] = isValidTime(n.data.startTime) ? formatClock(n.data.startTime) : null
    return badges
  }, [scheduled, nodes, startIds])
  const selectedSchedule = useMemo(
    () => ({
      parents: edges.filter((e) => e.target === selectedId).map((e) => nodes.find((n) => n.id === e.source)?.data.label ?? e.source),
      scheduled,
      cycleLabel: describeCycle(cycle),
    }),
    [edges, nodes, selectedId, scheduled, cycle],
  )

  if (loadError) {
    return (
      <div className="p-8 text-sm">
        <p className="text-rose-400">Could not load workflow: {loadError}</p>
        <Link to="/workflows" className="mt-2 inline-block text-[#8fb2f5] hover:underline">
          Back to workflows
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#23252c]">
      {/* top editor toolbar */}
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#2c2f3b] bg-[#1f2128] px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/workflows"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#8f96a8] transition-colors hover:bg-[#2a2d37] hover:text-white"
          >
            <ChevronLeft size={15} />
            Workflows
          </Link>
          <span className="text-[#454a5c]">/</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              markDirty()
            }}
            className="min-w-0 max-w-xs rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none transition-colors hover:border-[#343846] hover:bg-[#252831] focus:border-[#3d6ccc] focus:bg-[#18191e]"
            aria-label="Workflow name"
          />
          {dirty ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              Unsaved
            </span>
          ) : (
            workflow && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                Saved
              </span>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* How often the workflow runs; start times live on the start nodes */}
          <CyclePicker value={cycle} prefix="Schedule:" starts={starts} onChange={changeCycle} />

          {/* Active toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => {
              setEnabled((v) => !v)
              markDirty()
            }}
            className="flex items-center gap-2 rounded-lg border border-[#343846] bg-[#18191e] px-2.5 py-1 text-xs font-medium text-[#e4e6eb] hover:border-[#4b5063]"
          >
            <span className={enabled ? 'text-emerald-400' : 'text-[#7f8699]'}>
              {enabled ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                enabled ? 'bg-emerald-500' : 'bg-[#3c4152]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                  enabled ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </span>
          </button>

          <button
            onClick={save}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-[#343846] bg-[#252831] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#4b5063] hover:bg-[#2d303b] disabled:opacity-50"
          >
            <Save size={14} className="text-[#8f96a8]" />
            Save
          </button>

          {scheduled && (
            <button
              onClick={() => run('test-schedule')}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              title="Play out one cycle: each start node waits for its own start time (sped up: 1 hour = 3 seconds)"
            >
              <FlaskConical size={14} />
              Test schedule
            </button>
          )}

          <button
            onClick={() => run('now')}
            disabled={busy}
            title="Run now: every start node starts immediately"
            className="flex items-center gap-1.5 rounded-lg bg-[#3d6ccc] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#3d6ccc]/25 transition-colors hover:bg-[#2f5cb8] disabled:opacity-50"
          >
            <Play size={13} fill="currentColor" />
            Execute workflow
          </button>

          {/* Less frequent actions */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="relative flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[#343846] bg-[#252831] text-[#c4c8d4] transition-colors hover:border-[#4b5063] hover:bg-[#2d303b]"
              aria-label="More actions"
              aria-expanded={menuOpen}
              title="More actions"
            >
              <MoreHorizontal size={16} />
              {failureWebhook.enabled && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400" />}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[#343846] bg-[#1f2128] py-1 shadow-2xl shadow-black/60">
                  <MenuItem
                    icon={<ShieldCheck size={14} />}
                    label="Validate workflow"
                    hint="Check for missing settings"
                    onClick={() => {
                      setMenuOpen(false)
                      validate()
                    }}
                  />
                  <MenuItem
                    icon={<Bell size={14} className={failureWebhook.enabled ? 'text-emerald-400' : undefined} />}
                    label="Failure alerts"
                    hint={failureWebhook.enabled ? 'On' : 'Slack / MS Teams'}
                    onClick={() => {
                      setMenuOpen(false)
                      setSettingsTab('alerts')
                      setSettingsOpen(true)
                    }}
                  />
                  <MenuItem
                    icon={<Settings size={14} />}
                    label="Workflow settings"
                    hint="Name, description, schedule"
                    onClick={() => {
                      setMenuOpen(false)
                      setSettingsTab('general')
                      setSettingsOpen(true)
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {paletteOpen && (
          <ToolPalette tools={TOOLS} onAdd={addFromClick} onClose={() => setPaletteOpen(false)} />
        )}

        {/* Dotted canvas */}
        <div className="relative min-w-0 flex-1" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          {!paletteOpen && (
            <button
              onClick={() => setPaletteOpen(true)}
              title="Add nodes"
              className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-[#343846] bg-[#252831] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-black/30 transition-colors hover:border-[#3d6ccc] hover:bg-[#2c303b]"
            >
              <Plus size={15} className="text-[#8fb2f5]" />
              Add node
            </button>
          )}

          <CanvasContext.Provider value={{ errorIds, startBadges }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => {
                onNodesChange(changes)
                if (changes.some((c) => c.type === 'position' || c.type === 'remove')) setDirtyNow(true)
                if (changes.some((c) => c.type === 'remove' && c.id === selectedId)) setSelectedId(null)
              }}
              onEdgesChange={(changes) => {
                onEdgesChange(changes)
                if (changes.some((c) => c.type === 'remove')) markDirty()
              }}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#3a3f4f" />
              <Controls />
              <MiniMap
                pannable
                zoomable
                nodeColor="#3d6ccc"
                maskColor="rgba(24, 25, 30, 0.72)"
              />
            </ReactFlow>
          </CanvasContext.Provider>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="pointer-events-auto group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#3a3f4f] bg-[#1f2128]/90 px-10 py-8 text-center shadow-2xl backdrop-blur-sm transition-colors hover:border-[#3d6ccc]/70"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3a3f4f] bg-[#282b34] text-[#8fb2f5] transition-transform group-hover:scale-105">
                  <Plus size={22} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Add first step</div>
                  <div className="mt-1 max-w-xs text-xs text-[#8f96a8]">
                    Drag a node from the left panel onto the canvas, or click + to add it. Connect nodes from right port to left port.
                  </div>
                </div>
              </button>
            </div>
          )}

          {issues && (
            <div
              className={`absolute bottom-5 left-1/2 z-10 w-[28rem] max-w-[90%] -translate-x-1/2 rounded-xl border p-3.5 text-sm shadow-2xl backdrop-blur-md ${
                issues.length
                  ? 'border-rose-500/40 bg-[#271d21]/95 text-rose-200'
                  : 'border-emerald-500/40 bg-[#1d2823]/95 text-emerald-200'
              }`}
            >
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <CheckCircle2 size={16} /> Workflow is valid and ready to execute.
                </div>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-rose-300">
                    <AlertTriangle size={15} /> Fix {issues.length} issue{issues.length > 1 ? 's' : ''} before saving
                  </div>
                  <ul className="max-h-32 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-rose-200">
                    {issues.map((i, idx) => (
                      <li key={idx}>
                        {i.nodeId ? (
                          <button className="text-left underline-offset-2 hover:underline" onClick={() => setSelectedId(i.nodeId!)}>
                            {i.message}
                          </button>
                        ) : (
                          i.message
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

        </div>

        {selected && (
          <ConfigPanel
            key={selected.id}
            data={selected.data}
            schedule={selectedSchedule}
            issues={(issues ?? []).filter((i) => i.nodeId === selected.id).map((i) => i.message)}
            onChange={updateSelected}
            onRemove={removeSelected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Workflow Settings / Edit Details Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#343846] bg-[#1f2128] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Workflow Settings</h2>
                <p className="text-xs text-[#7f8699]">Edit workflow details, schedule, and failure alerts</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1 text-[#7f8699] hover:bg-[#2a2d37] hover:text-white"
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </div>

            {/* Settings tabs: General | Failure Alerts */}
            <div className="mb-4 flex border-b border-[#2c2f3b]">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  settingsTab === 'general' ? 'border-[#3d6ccc] text-white' : 'border-transparent text-[#8f96a8] hover:text-white'
                }`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('alerts')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  settingsTab === 'alerts' ? 'border-[#3d6ccc] text-white' : 'border-transparent text-[#8f96a8] hover:text-white'
                }`}
              >
                <span>Failure Alerts (Slack / Teams)</span>
                {failureWebhook.enabled && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </button>
            </div>

            {settingsTab === 'alerts' ? (
              <WebhookSettingsSection
                value={failureWebhook}
                workflowName={name}
                onChange={(next) => {
                  setFailureWebhook(next)
                  markDirty()
                }}
              />
            ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">Workflow name</span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    markDirty()
                  }}
                  className="w-full rounded-lg border border-[#343846] bg-[#18191e] px-3 py-2 text-sm text-white outline-none focus:border-[#3d6ccc]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    markDirty()
                  }}
                  placeholder="What does this workflow automate?"
                  className="w-full rounded-lg border border-[#343846] bg-[#18191e] px-3 py-2 text-xs text-white placeholder-[#686f82] outline-none focus:border-[#3d6ccc]"
                />
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">Automation schedule</span>
                <CyclePicker value={cycle} align="left" starts={starts} onChange={changeCycle} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#2c2f3b] bg-[#252831] px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-medium text-white">Active status</div>
                  <div className="text-[11px] text-[#7f8699]">Allow scheduled runs when active</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => {
                    setEnabled((v) => !v)
                    markDirty()
                  }}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    enabled ? 'bg-emerald-500' : 'bg-[#363a47]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                      enabled ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg border border-[#343846] bg-[#252831] px-3.5 py-1.5 text-xs font-medium text-[#e4e6eb] hover:bg-[#2d303b]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await save()
                  setSettingsOpen(false)
                }}
                className="rounded-lg bg-[#3d6ccc] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2f5cb8]"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[#e4e6eb] transition-colors hover:bg-[#2a2d37]">
      <span className="text-[#8f96a8]">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {hint && <span className="text-[11px] text-[#7f8699]">{hint}</span>}
    </button>
  )
}
