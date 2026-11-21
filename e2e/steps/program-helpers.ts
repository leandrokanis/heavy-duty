import { type APIRequestContext, type APIResponse, expect } from '@playwright/test'
import {
  APP_BASE_URL,
  type ExerciseBody,
  getProgram,
  type MuscleBody,
  type PlannedExerciseBody,
  type ProgramBody,
  postProgram,
  postProgramDay,
} from './catalog-api.js'
import { type ProgramState, programIdOf } from './program-fixtures.js'

const GRAMS_PER_KG = 1000

// The feature keeps the PRD wording ("40 kg", "10 reps", "45 s"); the API takes integers.
export function toLoadG(load: string): number {
  const kg = /^(\d+(?:,\d+)?) kg$/.exec(load)?.[1]
  if (kg === undefined) {
    throw new Error(`Load "${load}" is not in kg`)
  }
  return Math.round(Number(kg.replace(',', '.')) * GRAMS_PER_KG)
}

export function toTarget(target: string): {
  targetReps: number | null
  targetSeconds: number | null
} {
  const reps = /^(\d+) reps$/.exec(target)?.[1]
  if (reps !== undefined) {
    return { targetReps: Number(reps), targetSeconds: null }
  }
  const seconds = /^(\d+) s$/.exec(target)?.[1]
  if (seconds !== undefined) {
    return { targetReps: null, targetSeconds: Number(seconds) }
  }
  throw new Error(`Target "${target}" is neither reps nor seconds`)
}

export async function toExerciseSlug(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.get(`${APP_BASE_URL}/api/exercises`)
  const body = (await response.json()) as { exercises: (ExerciseBody & { slug: string })[] }
  const exercise = body.exercises.find((candidate) => candidate.name === name)
  if (!exercise) {
    throw new Error(`Exercise "${name}" is not registered`)
  }
  return exercise.slug
}

export async function toMuscleSlug(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.get(`${APP_BASE_URL}/api/muscles`)
  const body = (await response.json()) as { muscles: (MuscleBody & { slug: string })[] }
  const muscle = body.muscles.find((candidate) => candidate.name === name)
  if (!muscle) {
    throw new Error(`Muscle "${name}" is not registered`)
  }
  return muscle.slug
}

export async function createProgram(
  request: APIRequestContext,
  program: ProgramState,
  name: string,
  goal: string,
): Promise<APIResponse> {
  const response = await postProgram(request, { name, goal })
  expect(response.status()).toBe(201)
  const id = ((await response.json()) as ProgramBody).id
  program.programId = id
  program.programIdsByName[name] = id
  return response
}

export async function addDay(
  request: APIRequestContext,
  program: ProgramState,
  letter: string,
  label?: string,
): Promise<APIResponse> {
  return postProgramDay(request, programIdOf(program), { letter, label })
}

export async function readProgram(
  request: APIRequestContext,
  programId: string,
): Promise<ProgramBody> {
  return (await (await getProgram(request, programId)).json()) as ProgramBody
}

export async function readDayExercises(
  request: APIRequestContext,
  program: ProgramState,
  letter: string,
): Promise<PlannedExerciseBody[]> {
  const response = program.fetchedProgram ?? (await getProgram(request, programIdOf(program)))
  const body = (await response.json()) as ProgramBody
  return body.days.find((day) => day.letter === letter)?.exercises ?? []
}

export function plannedValues(
  name: string,
  sets: number,
  target: string,
  load: string,
  restSeconds: number,
) {
  return { name, sets, ...toTarget(target), loadG: toLoadG(load), restSeconds }
}
