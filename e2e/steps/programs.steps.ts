import { type APIRequestContext, type APIResponse, expect } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import {
  APP_BASE_URL,
  callMcpTool,
  type ExerciseBody,
  getProgram,
  type MuscleBody,
  type PlannedExerciseBody,
  type ProgramBody,
  postExercise,
  postPlannedExercise,
  postProgram,
  postProgramDay,
} from './catalog-api.js'
import {
  lastProgramResponseOf,
  letterOf,
  type ProgramState,
  programIdOf,
  test,
} from './program-fixtures.js'

const { Given, When, Then } = createBdd(test)

const GRAMS_PER_KG = 1000

// The feature keeps the PRD wording ("40 kg", "10 reps", "45 s"); the API takes integers.
function toLoadG(load: string): number {
  const kg = /^(\d+(?:,\d+)?) kg$/.exec(load)?.[1]
  if (kg === undefined) {
    throw new Error(`Load "${load}" is not in kg`)
  }
  return Math.round(Number(kg.replace(',', '.')) * GRAMS_PER_KG)
}

function toTarget(target: string): { targetReps: number | null; targetSeconds: number | null } {
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

async function toExerciseSlug(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.get(`${APP_BASE_URL}/api/exercises`)
  const body = (await response.json()) as { exercises: (ExerciseBody & { slug: string })[] }
  const exercise = body.exercises.find((candidate) => candidate.name === name)
  if (!exercise) {
    throw new Error(`Exercise "${name}" is not registered`)
  }
  return exercise.slug
}

async function toMuscleSlug(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.get(`${APP_BASE_URL}/api/muscles`)
  const body = (await response.json()) as { muscles: (MuscleBody & { slug: string })[] }
  const muscle = body.muscles.find((candidate) => candidate.name === name)
  if (!muscle) {
    throw new Error(`Muscle "${name}" is not registered`)
  }
  return muscle.slug
}

async function createProgram(
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

async function addDay(
  request: APIRequestContext,
  program: ProgramState,
  letter: string,
  label?: string,
): Promise<APIResponse> {
  return postProgramDay(request, programIdOf(program), { letter, label })
}

async function readProgram(request: APIRequestContext, programId: string): Promise<ProgramBody> {
  return (await (await getProgram(request, programId)).json()) as ProgramBody
}

async function readDayExercises(
  request: APIRequestContext,
  program: ProgramState,
  letter: string,
): Promise<PlannedExerciseBody[]> {
  const response = program.fetchedProgram ?? (await getProgram(request, programIdOf(program)))
  const body = (await response.json()) as ProgramBody
  return body.days.find((day) => day.letter === letter)?.exercises ?? []
}

function plannedValues(
  name: string,
  sets: number,
  target: string,
  load: string,
  restSeconds: number,
) {
  return { name, sets, ...toTarget(target), loadG: toLoadG(load), restSeconds }
}

Given('these exercises are registered:', async ({ request }, table: DataTable) => {
  for (const row of table.hashes()) {
    const response = await postExercise(request, {
      name: row.exercise ?? '',
      kind: row.kind ?? '',
      primaryMuscleSlugs: [await toMuscleSlug(request, row.primary ?? '')],
    })
    // Scenarios share one database, so the exercise scenarios may have registered it.
    const accepted =
      response.status() === 201 ||
      (response.status() === 409 &&
        ((await response.json()) as { code?: string }).code === 'exercise_already_exists')

    expect(accepted).toBe(true)
  }
})

Given('a program with goal {string}', async ({ request, program }, goal: string) => {
  await createProgram(request, program, 'Programa', goal)
})

Given(
  'a program with goal {string} and the day {string}',
  async ({ request, program }, goal: string, letter: string) => {
    await createProgram(request, program, 'Programa', goal)
    expect((await addDay(request, program, letter)).status()).toBe(201)
    program.letter = letter
  },
)

Given('an active program {string}', async ({ request, program }, name: string) => {
  await createProgram(request, program, name, 'hypertrophy')
})

When(
  'the planner adds {string} with {int} sets of {string}, a load of {string} and a rest of {int} s',
  async (
    { request, program },
    name: string,
    sets: number,
    target: string,
    load: string,
    restSeconds: number,
  ) => {
    program.lastResponse = await postPlannedExercise(
      request,
      programIdOf(program),
      letterOf(program),
      {
        exerciseSlug: await toExerciseSlug(request, name),
        sets,
        ...toTarget(target),
        loadG: toLoadG(load),
        restSeconds,
      },
    )
  },
)

When(
  'the planner gives repetitions for {string} in the day {string}',
  async ({ request, program }, name: string, letter: string) => {
    program.lastResponse = await postPlannedExercise(request, programIdOf(program), letter, {
      exerciseSlug: await toExerciseSlug(request, name),
      sets: 3,
      targetReps: 10,
      loadG: 0,
      restSeconds: 60,
    })
  },
)

When(
  'the planner gives seconds for {string} in the day {string}',
  async ({ request, program }, name: string, letter: string) => {
    program.lastResponse = await postPlannedExercise(request, programIdOf(program), letter, {
      exerciseSlug: await toExerciseSlug(request, name),
      sets: 3,
      targetSeconds: 45,
      loadG: 40000,
      restSeconds: 90,
    })
  },
)

When(
  'the planner adds the day {string} named {string} and the day {string} named {string}',
  async (
    { request, program },
    firstLetter: string,
    firstLabel: string,
    letter: string,
    label: string,
  ) => {
    expect((await addDay(request, program, firstLetter, firstLabel)).status()).toBe(201)
    program.lastResponse = await addDay(request, program, letter, label)
  },
)

When(
  'the planner adds another day {string} to the same program',
  async ({ request, program }, letter: string) => {
    program.lastResponse = await addDay(request, program, letter)
  },
)

When('the planner creates the program {string}', async ({ request, program }, name: string) => {
  program.lastResponse = await createProgram(request, program, name, 'strength')
})

Given(
  'the planner built through MCP a program with goal {string}, the day {string} and {string} with {int} sets of {string}, a load of {string} and a rest of {int} s',
  async (
    { request, program },
    goal: string,
    letter: string,
    name: string,
    sets: number,
    target: string,
    load: string,
    restSeconds: number,
  ) => {
    const callResult = async (tool: string, args: Record<string, unknown>) => {
      const response = await callMcpTool(request, tool, args)
      const body = (await response.json()) as {
        result?: { isError?: boolean; structuredContent?: ProgramBody }
      }
      expect(body.result?.isError).toBeFalsy()
      return body.result?.structuredContent
    }
    const created = await callResult('create_program', { name: 'Programa MCP', goal })
    program.programId = created?.id
    await callResult('add_program_day', { programId: program.programId, letter })
    await callResult('add_planned_exercise', {
      programId: program.programId,
      letter,
      exerciseSlug: await toExerciseSlug(request, name),
      sets,
      ...toTarget(target),
      loadG: toLoadG(load),
      restSeconds,
    })
  },
)

When('the program is requested over HTTP', async ({ request, program }) => {
  program.fetchedProgram = await getProgram(request, programIdOf(program))
})

Then(
  'the day {string} should show {string} with {int} sets of {string}, a load of {string} and a rest of {int} s',
  async (
    { request, program },
    letter: string,
    name: string,
    sets: number,
    target: string,
    load: string,
    restSeconds: number,
  ) => {
    const exercises = await readDayExercises(request, program, letter)

    expect(
      exercises.map((planned) => ({
        name: planned.exercise.name,
        sets: planned.sets,
        targetReps: planned.targetReps,
        targetSeconds: planned.targetSeconds,
        loadG: planned.loadG,
        restSeconds: planned.restSeconds,
      })),
    ).toEqual([plannedValues(name, sets, target, load, restSeconds)])
  },
)

Then(
  'the addition should be refused with the message {string}',
  async ({ program }, message: string) => {
    const response = lastProgramResponseOf(program)

    expect({
      refused: response.status() >= 400 && response.status() < 500,
      message: ((await response.json()) as { message?: string }).message,
    }).toEqual({ refused: true, message })
  },
)

Then(
  'the day {string} should still not have {string}',
  async ({ request, program }, letter: string, name: string) => {
    const exercises = await readDayExercises(request, program, letter)

    expect(exercises.map((planned) => planned.exercise.name)).not.toContain(name)
  },
)

Then(
  'the program should show the days {string}, in that order',
  async ({ request, program }, days: string) => {
    const body = await readProgram(request, programIdOf(program))

    expect(body.days.map((day) => `${day.letter} ${day.label}`).join(', ')).toBe(days)
  },
)

Then('{string} should be the active program', async ({ request, program }, name: string) => {
  const body = await readProgram(request, program.programIdsByName[name] ?? '')

  expect({ name: body.name, isActive: body.isActive }).toEqual({ name, isActive: true })
})

Then(
  '{string} should still be stored, without being the active program',
  async ({ request, program }, name: string) => {
    const body = await readProgram(request, program.programIdsByName[name] ?? '')

    expect({ name: body.name, isActive: body.isActive }).toEqual({ name, isActive: false })
  },
)
