import type { APIRequestContext, APIResponse } from '@playwright/test'

export const API_PORT = Number(process.env.E2E_API_PORT ?? 3101)
export const API_BASE_URL = `http://127.0.0.1:${API_PORT}`

// The browser and the data routes use the single origin of the e2e proxy.
export const APP_PORT = Number(process.env.E2E_PORT ?? 3100)
export const APP_BASE_URL = `http://localhost:${APP_PORT}`

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
  return request.post(`${APP_BASE_URL}/api/muscles`, { data })
}

export function postExercise(
  request: APIRequestContext,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${APP_BASE_URL}/api/exercises`, { data })
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

export type PlannedExerciseBody = {
  exercise: { slug: string; name: string; kind: string }
  sets: number
  targetReps: number | null
  targetSeconds: number | null
  loadG: number
  restSeconds: number
}

export type ProgramBody = {
  id: string
  name: string
  goal: string
  isActive: boolean
  days: { letter: string; label: string | null; exercises: PlannedExerciseBody[] }[]
}

export function postProgram(
  request: APIRequestContext,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${APP_BASE_URL}/api/programs`, { data })
}

export function postProgramDay(
  request: APIRequestContext,
  programId: string,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${APP_BASE_URL}/api/programs/${programId}/days`, { data })
}

export function postPlannedExercise(
  request: APIRequestContext,
  programId: string,
  letter: string,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post(`${APP_BASE_URL}/api/programs/${programId}/days/${letter}/exercises`, {
    data,
  })
}

export function getProgram(request: APIRequestContext, programId: string): Promise<APIResponse> {
  return request.get(`${APP_BASE_URL}/api/programs/${programId}`)
}

function programPath(programId: string, letter?: string, exerciseSlug?: string): string {
  const day = letter === undefined ? '' : `/days/${letter}`
  const exercise = exerciseSlug === undefined ? '' : `/exercises/${exerciseSlug}`
  return `${APP_BASE_URL}/api/programs/${programId}${day}${exercise}`
}

export function patchProgram(
  request: APIRequestContext,
  programId: string,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.patch(programPath(programId), { data })
}

export function activateProgram(
  request: APIRequestContext,
  programId: string,
): Promise<APIResponse> {
  return request.post(`${programPath(programId)}/activate`)
}

export function patchProgramDay(
  request: APIRequestContext,
  programId: string,
  letter: string,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.patch(programPath(programId, letter), { data })
}

export function deleteProgramDay(
  request: APIRequestContext,
  programId: string,
  letter: string,
): Promise<APIResponse> {
  return request.delete(programPath(programId, letter))
}

export function patchPlannedExercise(
  request: APIRequestContext,
  programId: string,
  letter: string,
  exerciseSlug: string,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.patch(programPath(programId, letter, exerciseSlug), { data })
}

export function deletePlannedExercise(
  request: APIRequestContext,
  programId: string,
  letter: string,
  exerciseSlug: string,
): Promise<APIResponse> {
  return request.delete(programPath(programId, letter, exerciseSlug))
}

export function listPrograms(request: APIRequestContext): Promise<APIResponse> {
  return request.get(`${APP_BASE_URL}/api/programs`)
}
