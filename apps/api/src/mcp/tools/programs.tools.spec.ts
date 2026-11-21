import { describe, expect, it } from 'vitest'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'

type App = ProgramTestApp['app']

type ToolCallResult = {
  content?: { type: string; text: string }[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

type JsonRpcResponse = { result?: ToolCallResult; error?: { code: number; message: string } }

async function callTool(
  app: App,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult | undefined> {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })
  return ((await response.json()) as JsonRpcResponse).result
}

const SUPINO_RETO_PLANNED = {
  exercise: { id: expect.any(String), slug: 'supino-reto', name: 'Supino reto', kind: 'reps' },
  sets: 3,
  targetReps: 10,
  targetSeconds: null,
  loadG: 40000,
  restSeconds: 90,
}

const PROGRAM_WITH_SUPINO_RETO = {
  id: expect.any(String),
  name: 'Programa 1',
  goal: 'hypertrophy',
  isActive: true,
  createdAt: '2026-11-21T10:00:00.000Z',
  days: [{ letter: 'A', label: null, exercises: [SUPINO_RETO_PLANNED] }],
}

async function createProgramWithDayA(app: App): Promise<string> {
  const created = await callTool(app, 'create_program', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  const programId = (created?.structuredContent as { id?: string } | undefined)?.id ?? ''
  await callTool(app, 'add_program_day', { programId, letter: 'A' })
  return programId
}

describe("Given the planner built through /mcp a program with goal hypertrophy and letter 'A'", () => {
  describe('When add_planned_exercise adds supino-reto with 3 sets of 10 reps, loadG 40000 and restSeconds 90', () => {
    it('Then should return the program as structured content and GET /api/programs/{id} should show the same values', async () => {
      const { app } = createProgramTestApp({ nodeEnv: 'development' })
      const programId = await createProgramWithDayA(app)

      const added = await callTool(app, 'add_planned_exercise', {
        programId,
        letter: 'A',
        exerciseSlug: 'supino-reto',
        sets: 3,
        targetReps: 10,
        loadG: 40000,
        restSeconds: 90,
      })
      const fetched = await (await app.request(`/api/programs/${programId}`)).json()

      expect({ structuredContent: added?.structuredContent, fetched }).toEqual({
        structuredContent: PROGRAM_WITH_SUPINO_RETO,
        fetched: PROGRAM_WITH_SUPINO_RETO,
      })
    })
  })
})

function errorBody(result: ToolCallResult | undefined) {
  return { isError: result?.isError, body: JSON.parse(result?.content?.[0]?.text ?? 'null') }
}

describe("Given letter 'A' built through /mcp and 'Prancha' of kind time", () => {
  describe('When add_planned_exercise gives targetReps for prancha', () => {
    it("Then should return an error result with code planned_exercise_target_time and message 'este exercício é medido por tempo'", async () => {
      const { app } = createProgramTestApp({ nodeEnv: 'development' })
      const programId = await createProgramWithDayA(app)

      const result = await callTool(app, 'add_planned_exercise', {
        programId,
        letter: 'A',
        exerciseSlug: 'prancha',
        sets: 3,
        targetReps: 10,
        loadG: 0,
        restSeconds: 60,
      })

      expect(errorBody(result)).toEqual({
        isError: true,
        body: {
          code: 'planned_exercise_target_time',
          message: 'este exercício é medido por tempo',
        },
      })
    })
  })
})

describe('Given a signed-in app in development', () => {
  describe('When add_program_day is called with an empty programId', () => {
    it('Then should return an error result with code program_not_found', async () => {
      const { app } = createProgramTestApp({ nodeEnv: 'development' })

      const result = await callTool(app, 'add_program_day', { programId: '', letter: 'A' })

      expect(errorBody(result)).toEqual({
        isError: true,
        body: { code: 'program_not_found', message: 'programa não encontrado' },
      })
    })
  })
})

async function addPlannedThroughMcp(app: App, programId: string, planned: Record<string, unknown>) {
  await callTool(app, 'add_planned_exercise', { programId, letter: 'A', ...planned })
}

const SUPINO_RETO_INPUT = {
  exerciseSlug: 'supino-reto',
  sets: 3,
  targetReps: 10,
  loadG: 40000,
  restSeconds: 90,
}

describe("Given letter 'A' with supino-reto at loadG 40000 built through /mcp", () => {
  describe('When update_planned_exercise sets loadG 42500 through /mcp', () => {
    it('Then should return the program as structured content and GET /api/programs/{id} should show supino-reto with loadG 42500', async () => {
      const { app } = createProgramTestApp({ nodeEnv: 'development' })
      const programId = await createProgramWithDayA(app)
      await addPlannedThroughMcp(app, programId, SUPINO_RETO_INPUT)

      const updated = await callTool(app, 'update_planned_exercise', {
        programId,
        letter: 'A',
        exerciseSlug: 'supino-reto',
        loadG: 42500,
      })
      const fetched = await (await app.request(`/api/programs/${programId}`)).json()
      const expected = {
        ...PROGRAM_WITH_SUPINO_RETO,
        days: [{ letter: 'A', label: null, exercises: [{ ...SUPINO_RETO_PLANNED, loadG: 42500 }] }],
      }

      expect({
        structuredContent: updated?.structuredContent,
        text: JSON.parse(updated?.content?.[0]?.text ?? 'null'),
        fetched,
      }).toEqual({ structuredContent: expected, text: expected, fetched: expected })
    })
  })
})

describe("Given letter 'A' with supino-reto and prancha built through /mcp", () => {
  it.each([
    {
      call: 'update_planned_exercise with targetReps for prancha',
      tool: 'update_planned_exercise',
      args: { letter: 'A', exerciseSlug: 'prancha', targetReps: 10 },
      error: { code: 'planned_exercise_target_time', message: 'este exercício é medido por tempo' },
    },
    {
      call: 'remove_planned_exercise without exerciseSlug',
      tool: 'remove_planned_exercise',
      args: { letter: 'A' },
      error: { code: 'planned_exercise_exercise_required', message: 'informe o exercício' },
    },
    {
      call: 'update_planned_exercise without exerciseSlug',
      tool: 'update_planned_exercise',
      args: { letter: 'A', loadG: 42500 },
      error: { code: 'planned_exercise_exercise_required', message: 'informe o exercício' },
    },
    {
      call: 'activate_program without programId',
      tool: 'activate_program',
      args: { programId: undefined },
      error: { code: 'program_not_found', message: 'programa não encontrado' },
    },
  ])(
    'When $call / Then should return an error result with $error.code',
    async ({ tool, args, error }) => {
      const { app } = createProgramTestApp({ nodeEnv: 'development' })
      const programId = await createProgramWithDayA(app)
      await addPlannedThroughMcp(app, programId, SUPINO_RETO_INPUT)
      await addPlannedThroughMcp(app, programId, {
        exerciseSlug: 'prancha',
        sets: 3,
        targetSeconds: 45,
        loadG: 0,
        restSeconds: 60,
      })

      const result = await callTool(app, tool, { programId, ...args })

      expect(errorBody(result)).toEqual({ isError: true, body: error })
    },
  )
})
