import { expect } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import {
  callMcpTool,
  getProgram,
  type ProgramBody,
  postExercise,
  postPlannedExercise,
} from './catalog-api.js'
import { lastProgramResponseOf, letterOf, programIdOf, test } from './program-fixtures.js'
import {
  addDay,
  createProgram,
  plannedValues,
  readDayExercises,
  readProgram,
  toExerciseSlug,
  toLoadG,
  toMuscleSlug,
  toTarget,
} from './program-helpers.js'

const { Given, When, Then } = createBdd(test)

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
