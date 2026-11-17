import { httpApi } from './http'
import { mockApi } from './mock'
import type { Api } from './types'

// Set VITE_API_MODE=http in .env.local once the FastAPI backend is running.
export const api: Api = import.meta.env.VITE_API_MODE === 'http' ? httpApi : mockApi

export type { WorkflowInput } from './types'
