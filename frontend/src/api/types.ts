import type { Run, ToolDefinition, Workflow } from '../types'

export type WorkflowInput = Pick<Workflow, 'name' | 'description' | 'enabled' | 'cycle' | 'failureWebhook' | 'nodes' | 'edges'>

/**
 * now           = start every start node immediately (manual run)
 * test-schedule = play out one cycle: each start node waits for its start time, sped up
 */
export type StartMode = 'now' | 'test-schedule'

/**
 * Everything the UI needs from the backend. Two implementations exist:
 *  - mock.ts: runs in the browser (localStorage + simulated runs), used until the backend is ready
 *  - http.ts: calls the FastAPI backend
 */
export interface Api {
  listTools(): Promise<ToolDefinition[]>

  listWorkflows(): Promise<Workflow[]>
  getWorkflow(id: string): Promise<Workflow>
  createWorkflow(input: WorkflowInput): Promise<Workflow>
  updateWorkflow(id: string, input: Partial<WorkflowInput>): Promise<Workflow>
  deleteWorkflow(id: string): Promise<void>

  startRun(workflowId: string, mode?: StartMode): Promise<Run>
  listRuns(workflowId?: string): Promise<Run[]>
  getRun(id: string): Promise<Run>
  cancelRun(id: string): Promise<Run>
  retryTask(runId: string, nodeId: string): Promise<Run>
  /** Starts a start node that is still waiting for its scheduled time, right away. */
  startTaskNow(runId: string, nodeId: string): Promise<Run>
}
