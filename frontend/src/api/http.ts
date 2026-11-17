import type { Api } from './types'

/** Talks to the FastAPI backend. Vite forwards /api to http://localhost:8000 in development. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const httpApi: Api = {
  listTools: () => request('/tools'),

  listWorkflows: () => request('/workflows'),
  getWorkflow: (id) => request(`/workflows/${id}`),
  createWorkflow: (input) => request('/workflows', { method: 'POST', body: JSON.stringify(input) }),
  updateWorkflow: (id, input) => request(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteWorkflow: (id) => request(`/workflows/${id}`, { method: 'DELETE' }),

  // body.mode: "now" (all start nodes immediately) or "test-schedule" (start nodes wait for their times)
  startRun: (workflowId, mode = 'now') => request(`/workflows/${workflowId}/run`, { method: 'POST', body: JSON.stringify({ mode }) }),
  listRuns: (workflowId) => request(workflowId ? `/runs?workflow_id=${workflowId}` : '/runs'),
  getRun: (id) => request(`/runs/${id}`),
  cancelRun: (id) => request(`/runs/${id}/cancel`, { method: 'POST' }),
  retryTask: (runId, nodeId) => request(`/runs/${runId}/tasks/${nodeId}/retry`, { method: 'POST' }),
  startTaskNow: (runId, nodeId) => request(`/runs/${runId}/tasks/${nodeId}/start`, { method: 'POST' }),
}
