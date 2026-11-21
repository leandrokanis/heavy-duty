import type { APIRequestContext, APIResponse } from '@playwright/test'

export const API_PORT = Number(process.env.E2E_API_PORT ?? 3101)
export const API_BASE_URL = `http://127.0.0.1:${API_PORT}`

export type MuscleBody = {
  name: string
  muscleGroup: { slug: string; name: string }
}

export type ExerciseBody = {
  name: string
  kind: string
  muscles: { slug: string; role: string }[]
  muscleGroups: { slug: string; name: string }[]
}

export function postMuscle(
  request: APIRequestContext,
  data: Record<string, string>,
): Promise<APIResponse> {
  return request.post(`${API_BASE_URL}/api/muscles`, { data })
}

export function postExercise(
  request: APIRequestContext,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${API_BASE_URL}/api/exercises`, { data })
}

export function callMcpTool(
  request: APIRequestContext,
  name: string,
  args: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${API_BASE_URL}/mcp`, {
    headers: { accept: 'application/json, text/event-stream' },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
  })
}
