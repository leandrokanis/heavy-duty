import { describe, expect, it } from 'vitest'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'

type App = ProgramTestApp['app']

type JsonRpcResponse = {
  result?: {
    structuredContent?: unknown
    isError?: boolean
    content?: { type: string; text: string }[]
    tools?: { name: string; description?: string; annotations?: { readOnlyHint?: boolean } }[]
  }
}

async function rpc(app: App, method: string, params: Record<string, unknown>) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return (await response.json()) as JsonRpcResponse
}

function callTool(app: App, args: Record<string, unknown>) {
  return rpc(app, 'tools/call', { name: 'list_workouts', arguments: args })
}

async function sendJson(app: App, path: string, body: Record<string, unknown>) {
  const response = await app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await response.json()) as { id: string }
}

const FROM = '2026-11-09T03:00:00.000Z'
const TO = '2026-11-16T03:00:00.000Z'

// Letter 'A' with supino-reto, and two workouts of it inside the week.
async function givenTwoWorkoutsInTheWeek(): Promise<ProgramTestApp> {
  const testApp = createProgramTestApp()
  const { app, db, clock } = testApp
  const { id: programId } = await sendJson(app, '/api/programs', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  await sendJson(app, `/api/programs/${programId}/days`, { letter: 'A', label: 'Superior' })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  for (const startedAt of ['2026-11-10T18:00:00.000Z', '2026-11-12T18:00:00.000Z']) {
    clock.advance(1000)
    recordWorkout(
      db,
      {
        programId,
        letter: 'A',
        startedAt,
        sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
      },
      clock.now(),
    )
  }
  return testApp
}

describe('Given two workouts in the week', () => {
  describe('When list_workouts is called through /mcp with the interval of the week', () => {
    it('Then structuredContent should equal the body of GET /api/workouts with the same interval', async () => {
      const { app } = await givenTwoWorkoutsInTheWeek()

      const called = await callTool(app, { from: FROM, to: TO })
      const response = await app.request(`/api/workouts?from=${FROM}&to=${TO}`)

      expect(called.result?.structuredContent).toEqual(await response.json())
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then list_workouts should be read only and say that to is exclusive, the 92 days and the 03:00Z example', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'list_workouts')

      expect({
        readOnlyHint: tool?.annotations?.readOnlyHint,
        mentions: ['exclusive', '92 days', '03:00Z'].filter((part) =>
          tool?.description?.includes(part),
        ),
      }).toEqual({ readOnlyHint: true, mentions: ['exclusive', '92 days', '03:00Z'] })
    })
  })
})

describe('Given a call without the end of the interval', () => {
  describe('When list_workouts is called through /mcp with from and no to', () => {
    it('Then should return isError with workout_range_required in the text and no structuredContent', async () => {
      const { app } = createProgramTestApp()

      const called = await callTool(app, { from: FROM })

      expect({
        isError: called.result?.isError,
        text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
        structuredContent: called.result?.structuredContent,
      }).toEqual({
        isError: true,
        text: {
          code: 'workout_range_required',
          message: 'informe o início e o fim do intervalo em UTC',
        },
        structuredContent: undefined,
      })
    })
  })
})
