import { getTool } from '../tools/registry'
import type { WorkflowCycle, WorkflowEdge, WorkflowNode } from '../types'
import { formatClock, isScheduled, isValidTime, startNodeIds, timeToMinutes } from './schedule'

export interface ValidationIssue {
  nodeId?: string
  message: string
}

/** Checks a workflow before saving or running. The backend will run the same checks. */
export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[], cycle?: WorkflowCycle): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (nodes.length === 0) {
    issues.push({ message: 'Add at least one task to the canvas.' })
    return issues
  }

  for (const node of nodes) {
    const tool = getTool(node.data.toolType)
    if (!tool) {
      issues.push({ nodeId: node.id, message: `Unknown tool "${node.data.toolType}".` })
      continue
    }
    for (const field of tool.fields) {
      const value = node.data.config[field.key]
      if (field.required && (value === undefined || value === '')) {
        issues.push({ nodeId: node.id, message: `${node.data.label}: "${field.label}" is required.` })
      }
      if (field.type === 'textarea' && field.label.includes('JSON') && typeof value === 'string' && value.trim()) {
        try {
          JSON.parse(value)
        } catch {
          issues.push({ nodeId: node.id, message: `${node.data.label}: "${field.label}" is not valid JSON.` })
        }
      }
    }
  }

  const labels = new Map<string, string>()
  for (const node of nodes) {
    const other = labels.get(node.data.label)
    if (other) issues.push({ nodeId: node.id, message: `Two tasks are named "${node.data.label}". Names must be unique.` })
    labels.set(node.data.label, node.id)
  }

  if (hasCycle(nodes, edges)) {
    issues.push({ message: 'The arrows form a loop. A workflow must flow in one direction.' })
  }

  if (cycle && isScheduled(cycle)) issues.push(...validateSchedule(nodes, edges, cycle))
  return issues
}

/** Every start node needs a start time, and all start times must come before the deadline. */
function validateSchedule(nodes: WorkflowNode[], edges: WorkflowEdge[], cycle: WorkflowCycle): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (cycle.frequency === 'weekly' && cycle.weekdays.length === 0) {
    issues.push({ message: 'Pick at least one day of the week for the schedule.' })
  }
  const deadlineOk = isValidTime(cycle.deadline)
  if (!deadlineOk) issues.push({ message: 'Set a valid deadline time for the schedule.' })

  const starts = startNodeIds(nodes, edges)
  for (const node of nodes) {
    if (!starts.has(node.id)) continue
    const time = node.data.startTime
    if (!isValidTime(time)) {
      issues.push({ nodeId: node.id, message: `${node.data.label}: start nodes need a start time (the workflow runs on a schedule).` })
    } else if (deadlineOk && timeToMinutes(time) >= timeToMinutes(cycle.deadline)) {
      issues.push({
        nodeId: node.id,
        message: `${node.data.label}: starts at ${formatClock(time)}, which is not before the deadline (${formatClock(cycle.deadline)}).`,
      })
    }
  }
  return issues
}

function hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const children = new Map<string, string[]>()
  for (const e of edges) children.set(e.source, [...(children.get(e.source) ?? []), e.target])
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (id: string): boolean => {
    if (state.get(id) === 'visiting') return true
    if (state.get(id) === 'done') return false
    state.set(id, 'visiting')
    for (const child of children.get(id) ?? []) if (visit(child)) return true
    state.set(id, 'done')
    return false
  }
  return nodes.some((n) => visit(n.id))
}
