import { type APIRequestContext, expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  APP_BASE_URL,
  activateProgram,
  callMcpTool,
  deletePlannedExercise,
  deleteProgramDay,
  listPrograms,
  type PlannedExerciseBody,
  type ProgramBody,
  patchPlannedExercise,
  patchProgram,
  postPlannedExercise,
} from './catalog-api.js'
import {
  lastProgramResponseOf,
  letterOf,
  type ProgramState,
  programIdOf,
  test,
  workoutIdOf,
} from './program-fixtures.js'
import {
  addDay,
  createProgram,
  readDayExercises,
  readProgram,
  toLoadG,
  toTarget,
} from './program-helpers.js'
import { readWorkout, recordWorkout } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

type CatalogExercise = { slug: string; kind: 'reps' | 'time' }

async function findExercise(request: APIRequestContext, name: string): Promise<CatalogExercise> {
  const response = await request.get(`${APP_BASE_URL}/api/exercises`)
  const body = (await response.json()) as { exercises: (CatalogExercise & { name: string })[] }
  const exercise = body.exercises.find((candidate) => candidate.name === name)
  if (!exercise) {
    throw new Error(`Exercise "${name}" is not registered`)
  }
  return exercise
}

// Reps exercises are planned 3 x 10 and time exercises 3 x 45 s, with 90 s rest.
async function planExercise(
  request: APIRequestContext,
  program: ProgramState,
  letter: string,
  name: string,
  loadG: number,
): Promise<CatalogExercise> {
  const exercise = await findExercise(request, name)
  const target = exercise.kind === 'reps' ? { targetReps: 10 } : { targetSeconds: 45 }
  const response = await postPlannedExercise(request, programIdOf(program), letter, {
    exerciseSlug: exercise.slug,
    sets: 3,
    ...target,
    loadG,
    restSeconds: 90,
  })
  expect(response.status()).toBe(201)
  return exercise
}

function recordSet(exercise: CatalogExercise, loadG: number) {
  return exercise.kind === 'reps'
    ? { exerciseSlug: exercise.slug, loadG, reps: 10 }
    : { exerciseSlug: exercise.slug, loadG, seconds: 45 }
}

async function activePlanned(
  request: APIRequestContext,
  letter: string,
  name: string,
): Promise<PlannedExerciseBody | undefined> {
  const body = (await (await listPrograms(request)).json()) as { programs: ProgramBody[] }
  return body.programs
    .find((candidate) => candidate.isActive)
    ?.days.find((day) => day.letter === letter)
    ?.exercises.find((planned) => planned.exercise.name === name)
}

Given(
  'a recorded workout with {string} at {string}',
  async ({ request, program }, name: string, load: string) => {
    await createProgram(request, program, 'Programa', 'hypertrophy')
    expect((await addDay(request, program, 'A')).status()).toBe(201)
    program.letter = 'A'
    const exercise = await planExercise(request, program, 'A', name, toLoadG(load))
    program.workoutId = recordWorkout(programIdOf(program), 'A', [
      recordSet(exercise, toLoadG(load)),
    ])
  },
)

When(
  'the planner changes the load of {string} in the program to {string}',
  async ({ request, program }, name: string, load: string) => {
    const exercise = await findExercise(request, name)
    program.lastResponse = await patchPlannedExercise(
      request,
      programIdOf(program),
      letterOf(program),
      exercise.slug,
      { loadG: toLoadG(load) },
    )
    expect(program.lastResponse.status()).toBe(200)
  },
)

Then(
  'the next workout should suggest {string} for {string}',
  async ({ request, program }, load: string, name: string) => {
    const planned = await activePlanned(request, letterOf(program), name)

    expect(planned?.loadG).toBe(toLoadG(load))
  },
)

Then(
  'the recorded workout should still have {string} at {string}',
  async ({ request, program }, name: string, load: string) => {
    const exercise = await findExercise(request, name)
    const workout = readWorkout(workoutIdOf(program))

    expect(workout?.sets.map(({ exerciseSlug, loadG }) => ({ exerciseSlug, loadG }))).toEqual([
      { exerciseSlug: exercise.slug, loadG: toLoadG(load) },
    ])
  },
)

// Only the target of the given kind is sent: a null target of the exercise's own kind is refused.
function targetOf(target: string): { targetReps: number } | { targetSeconds: number } {
  const { targetReps, targetSeconds } = toTarget(target)
  return targetReps === null ? { targetSeconds: targetSeconds as number } : { targetReps }
}

async function givenProgramWithDays(
  request: APIRequestContext,
  program: ProgramState,
  letters: readonly string[],
): Promise<void> {
  await createProgram(request, program, 'Programa', 'hypertrophy')
  for (const letter of letters) {
    expect((await addDay(request, program, letter)).status()).toBe(201)
  }
  program.letter = letters[0]
}

Given(
  'a program with the day {string} and {string} with {int} sets of {string}, a load of {string} and a rest of {int} s',
  async (
    { request, program },
    letter: string,
    name: string,
    sets: number,
    target: string,
    load: string,
    restSeconds: number,
  ) => {
    await givenProgramWithDays(request, program, [letter])
    const exercise = await findExercise(request, name)
    const response = await postPlannedExercise(request, programIdOf(program), letter, {
      exerciseSlug: exercise.slug,
      sets,
      ...targetOf(target),
      loadG: toLoadG(load),
      restSeconds,
    })
    expect(response.status()).toBe(201)
  },
)

Given(
  'a program with the days {string} and a recorded workout of the day {string} with {string} at {string}',
  async ({ request, program }, letters: string, letter: string, name: string, load: string) => {
    await givenProgramWithDays(request, program, letters.split(', '))
    const exercise = await planExercise(request, program, letter, name, toLoadG(load))
    program.workoutId = recordWorkout(programIdOf(program), letter, [
      recordSet(exercise, toLoadG(load)),
    ])
  },
)

Given(
  'the programs {string} and {string}, with {string} active',
  async ({ request, program }, first: string, second: string, active: string) => {
    const [inactive] = [first, second].filter((name) => name !== active)
    await createProgram(request, program, inactive ?? '', 'hypertrophy')
    await createProgram(request, program, active, 'strength')
  },
)

Given(
  'the planner changed through MCP the load of {string} in the day {string} to {string}',
  async ({ request, program }, name: string, letter: string, load: string) => {
    const exercise = await findExercise(request, name)
    const response = await callMcpTool(request, 'update_planned_exercise', {
      programId: programIdOf(program),
      letter,
      exerciseSlug: exercise.slug,
      loadG: toLoadG(load),
    })
    const body = (await response.json()) as { result?: { isError?: boolean } }
    expect(body.result?.isError).toBeFalsy()
  },
)

When(
  'the planner changes {string} in the day {string} to {int} sets of {string} and a rest of {int} s',
  async (
    { request, program },
    name: string,
    letter: string,
    sets: number,
    target: string,
    restSeconds: number,
  ) => {
    const exercise = await findExercise(request, name)
    program.lastResponse = await patchPlannedExercise(
      request,
      programIdOf(program),
      letter,
      exercise.slug,
      { sets, ...targetOf(target), restSeconds },
    )
  },
)

When(
  'the planner changes the target of {string} in the day {string} to {string}',
  async ({ request, program }, name: string, letter: string, target: string) => {
    const exercise = await findExercise(request, name)
    program.lastResponse = await patchPlannedExercise(
      request,
      programIdOf(program),
      letter,
      exercise.slug,
      targetOf(target),
    )
  },
)

When('the planner changes the goal to {string}', async ({ request, program }, goal: string) => {
  program.lastResponse = await patchProgram(request, programIdOf(program), { goal })
})

When(
  'the planner removes the day {string} from the program',
  async ({ request, program }, letter: string) => {
    program.lastResponse = await deleteProgramDay(request, programIdOf(program), letter)
  },
)

When(
  'the planner removes {string} from the day {string}',
  async ({ request, program }, name: string, letter: string) => {
    const exercise = await findExercise(request, name)
    program.lastResponse = await deletePlannedExercise(
      request,
      programIdOf(program),
      letter,
      exercise.slug,
    )
  },
)

When(
  'the planner chooses {string} as the active program',
  async ({ request, program }, name: string) => {
    program.lastResponse = await activateProgram(request, program.programIdsByName[name] ?? '')
  },
)

Then(
  'the edit should be refused with the message {string}',
  async ({ program }, message: string) => {
    const response = lastProgramResponseOf(program)

    expect({
      refused: response.status() >= 400 && response.status() < 500,
      message: ((await response.json()) as { message?: string }).message,
    }).toEqual({ refused: true, message })
  },
)

Then('the program should show the goal {string}', async ({ request, program }, goal: string) => {
  const body = await readProgram(request, programIdOf(program))

  expect(body.goal).toBe(goal)
})

Then(
  'the program should show only the days {string}, in that order',
  async ({ request, program }, letters: string) => {
    const body = await readProgram(request, programIdOf(program))

    expect(body.days.map((day) => day.letter).join(', ')).toBe(letters)
  },
)

Then(
  'the recorded workout should still be of the day {string}, with {string} at {string}',
  async ({ request, program }, letter: string, name: string, load: string) => {
    const exercise = await findExercise(request, name)
    const workout = readWorkout(workoutIdOf(program))

    expect({
      letter: workout?.letter,
      sets: workout?.sets.map(({ exerciseSlug, loadG }) => ({ exerciseSlug, loadG })),
    }).toEqual({ letter, sets: [{ exerciseSlug: exercise.slug, loadG: toLoadG(load) }] })
  },
)

Then(
  'the day {string} should no longer show {string}',
  async ({ request, program }, letter: string, name: string) => {
    const exercises = await readDayExercises(request, program, letter)

    expect({
      status: lastProgramResponseOf(program).status(),
      names: exercises.map((planned) => planned.exercise.name),
    }).toEqual({ status: 200, names: expect.not.arrayContaining([name]) })
  },
)
