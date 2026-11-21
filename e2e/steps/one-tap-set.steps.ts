import { randomUUID } from 'node:crypto'
import { type APIRequestContext, type APIResponse, expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { APP_BASE_URL } from './catalog-api.js'
import { type ProgramState, test, workoutIdOf } from './program-fixtures.js'
import { toExerciseSlug } from './program-helpers.js'
import { readWorkout, readWorkoutSets } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

const SETS_ROUTE = '**/api/workouts/*/sets'
const SETS_PATH = /^\/api\/workouts\/([^/]+)\/sets$/

type SetBody = {
  id: string
  workout: { programId: string; letter: string; startedAt: string }
  plannedExerciseId: string
  exerciseId: string
  setNumber: number
  loadG: number
  reps?: number
  seconds?: number
  performedAt: string
}

type TodayBody = {
  program: { id: string } | null
  days: {
    letter: string
    exercises: { plannedExerciseId: string; exercise: { id: string; name: string } }[]
  }[]
}

// What the page sent and when the athlete tapped, per scenario page.
type SendState = { bodies: SetBody[]; posts: number; tapAtMs?: number }
const sendStates = new WeakMap<Page, SendState>()

// The resend scenario talks to the API directly, so its state hangs on the program fixture.
const resendStates = new WeakMap<ProgramState, { body: SetBody; second?: APIResponse }>()

function sendStateOf(page: Page): SendState {
  let state = sendStates.get(page)
  if (!state) {
    state = { bodies: [], posts: 0 }
    sendStates.set(page, state)
    const created = state
    page.on('request', (request) => {
      if (request.method() === 'POST' && SETS_PATH.test(new URL(request.url()).pathname)) {
        created.posts += 1
      }
    })
  }
  return state
}

function nextButton(page: Page) {
  return page.getByRole('button', { name: 'Próximo' })
}

function restTimer(page: Page) {
  return page.getByRole('timer', { name: 'Descanso' })
}

// Waits for the set POST that the action triggers and keeps its workout id and body.
async function captureSend(page: Page, program: ProgramState, action: () => Promise<void>) {
  const state = sendStateOf(page)
  const sent = page.waitForRequest(
    (request) => request.method() === 'POST' && SETS_PATH.test(new URL(request.url()).pathname),
  )
  await action()
  const request = await sent
  program.workoutId = SETS_PATH.exec(new URL(request.url()).pathname)?.[1]
  state.bodies.push(request.postDataJSON() as SetBody)
  return request
}

async function firstPlannedOf(request: APIRequestContext, letter: string, name: string) {
  const today = (await (await request.get(`${APP_BASE_URL}/api/today`)).json()) as TodayBody
  const planned = today.days
    .find((day) => day.letter === letter)
    ?.exercises.find((item) => item.exercise.name === name)
  if (!today.program || !planned) {
    throw new Error(`"${name}" is not in the day "${letter}" of the active program`)
  }
  return { programId: today.program.id, planned }
}

function postSet(request: APIRequestContext, workoutId: string, body: SetBody) {
  return request.post(`${APP_BASE_URL}/api/workouts/${workoutId}/sets`, { data: body })
}

Given(
  'the athlete started the day {string} at {string}',
  async ({ page }, letter: string, startedAt: string) => {
    sendStateOf(page)
    await page.clock.setFixedTime(new Date(startedAt))
    await page.goto('/')
    await page.getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Começar' }).click()
    await expect(nextButton(page)).toBeVisible()
  },
)

Given('the API does not answer the sets', async ({ page }) => {
  await page.route(SETS_ROUTE, (route) => route.abort('failed'))
})

Given(
  'the API recorded the first set of {string} with the id X',
  async ({ request, program }, name: string) => {
    const { programId, planned } = await firstPlannedOf(request, 'A', name)
    program.workoutId = randomUUID()
    const body: SetBody = {
      id: randomUUID(),
      workout: { programId, letter: 'A', startedAt: '2026-11-21T18:30:00.000Z' },
      plannedExerciseId: planned.plannedExerciseId,
      exerciseId: planned.exercise.id,
      setNumber: 1,
      loadG: 40000,
      reps: 10,
      performedAt: '2026-11-21T18:31:05.000Z',
    }
    expect((await postSet(request, program.workoutId, body)).status()).toBe(201)
    resendStates.set(program, { body })
  },
)

When(
  'the athlete taps {string} at {string}',
  async ({ page, program }, name: string, tappedAt: string) => {
    const state = sendStateOf(page)
    state.tapAtMs = Date.parse(tappedAt)
    await page.clock.setFixedTime(new Date(tappedAt))
    await captureSend(page, program, () => page.getByRole('button', { name }).click())
  },
)

When('the athlete taps {string} twice in a row', async ({ page, program }, name: string) => {
  const request = await captureSend(page, program, () =>
    page.getByRole('button', { name }).dblclick(),
  )
  await request.response()
})

When('the API answers again and the queue sends the set', async ({ page, program }) => {
  await page.unroute(SETS_ROUTE)
  // The queue retries on a timer too; the online event only spares the test the 15 s wait.
  const request = await captureSend(page, program, async () => {
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
  })
  expect((await request.response())?.status()).toBe(201)
})

When(
  'the app sends the set with the id X again with the same values',
  async ({ request, program }) => {
    const state = resendStates.get(program)
    if (!state) {
      throw new Error('No set was recorded by a previous step')
    }
    state.second = await postSet(request, workoutIdOf(program), {
      ...state.body,
      performedAt: '2026-11-21T18:40:00.000Z',
    })
  },
)

Then(
  'the set of {string} should be recorded with load {int} g, {int} reps and set number {int} in the workout of the day {string}',
  async (
    { request, program },
    name: string,
    loadG: number,
    reps: number,
    setNumber: number,
    letter: string,
  ) => {
    const workoutId = workoutIdOf(program)
    const exerciseSlug = await toExerciseSlug(request, name)
    await expect
      .poll(() => readWorkoutSets(workoutId).map(({ id: _id, ...set }) => set))
      .toEqual([
        {
          exerciseSlug,
          setNumber,
          loadG,
          reps,
          seconds: null,
        },
      ])
    expect(readWorkout(workoutId)?.letter).toBe(letter)
  },
)

Then('the rest should show {string}', async ({ page }, clock: string) => {
  await expect(restTimer(page)).toHaveText(clock)
})

Then('the rest should show {string} one second later', async ({ page }, clock: string) => {
  const tapAtMs = sendStateOf(page).tapAtMs
  if (tapAtMs === undefined) {
    throw new Error('No tap time was recorded by a previous step')
  }
  await page.clock.setFixedTime(new Date(tapAtMs + 1000))
  await expect(restTimer(page)).toHaveText(clock)
})

Then(
  'the {string} button should be at least 56 px tall in the lower half of the screen',
  async ({ page }, name: string) => {
    const box = await page.getByRole('button', { name }).boundingBox()
    const viewport = page.viewportSize()

    expect({
      tallEnough: (box?.height ?? 0) >= 56,
      lowerHalf: box !== null && viewport !== null && box.y >= viewport.height / 2,
    }).toEqual({ tallEnough: true, lowerHalf: true })
  },
)

Then('only one set should be recorded in the workout', async ({ page, program }) => {
  const workoutId = workoutIdOf(program)
  await expect.poll(() => readWorkoutSets(workoutId).length).toBe(1)
  expect(sendStateOf(page).posts).toBe(1)
})

Then(
  'the workout of the day {string} should exist with the start {string}',
  async ({ program }, letter: string, startedAt: string) => {
    const workoutId = workoutIdOf(program)
    await expect.poll(() => readWorkout(workoutId)?.startedAt).toBe(startedAt)
    expect(readWorkout(workoutId)?.letter).toBe(letter)
  },
)

Then(
  'the next set of the same workout should go into the same workout',
  async ({ page, request, program }) => {
    const workoutId = workoutIdOf(program)
    const [first] = sendStateOf(page).bodies
    if (!first) {
      throw new Error('No set was sent by a previous step')
    }
    await expect.poll(() => readWorkoutSets(workoutId).length).toBe(1)

    const response = await postSet(request, workoutId, { ...first, id: randomUUID(), setNumber: 2 })

    expect({
      status: response.status(),
      setNumbers: readWorkoutSets(workoutId).map(({ setNumber }) => setNumber),
    }).toEqual({ status: 201, setNumbers: [1, 2] })
  },
)

Then('the screen should show {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

Then(
  'only one set should be recorded in the workout, with the id of the first send',
  async ({ page, program }) => {
    const workoutId = workoutIdOf(program)
    const [first, resent] = sendStateOf(page).bodies

    await expect.poll(() => readWorkoutSets(workoutId).map(({ id }) => id)).toEqual([first?.id])
    expect(resent).toEqual(first)
  },
)

Then('the API should answer 200 with the recorded set', async ({ program }) => {
  const state = resendStates.get(program)

  expect({
    status: state?.second?.status(),
    body: await state?.second?.json(),
  }).toEqual({
    status: 200,
    body: expect.objectContaining({
      id: state?.body.id,
      performedAt: '2026-11-21T18:31:05.000Z',
    }),
  })
})

Then('the workout should still have one set', async ({ program }) => {
  expect(readWorkoutSets(workoutIdOf(program)).length).toBe(1)
})
