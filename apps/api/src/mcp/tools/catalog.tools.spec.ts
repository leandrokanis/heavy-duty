import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { createMcpAuthorizedApp } from '../../test/mcp-auth.js'
import { createSignedInApp } from '../../test/session.js'

type ToolCallResult = {
  content?: { type: string; text: string }[]
  structuredContent?: unknown
  isError?: boolean
}

type JsonRpcResponse = { result?: ToolCallResult; error?: { code: number; message: string } }

function createSeededApp(): ReturnType<typeof createApp> {
  const db = createTestDatabase()
  runSeed(db)
  return createMcpAuthorizedApp(
    createSignedInApp(createApp({ nodeEnv: 'development', databaseHealth: () => true, db }), db),
    db,
  )
}

async function callTool(
  app: ReturnType<typeof createApp>,
  name: string,
  args: Record<string, unknown>,
): Promise<JsonRpcResponse> {
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
  return (await response.json()) as JsonRpcResponse
}

const PEITORAL_MAIOR = {
  id: expect.any(String),
  slug: 'peitoral-maior',
  name: 'peitoral maior',
  muscleGroup: { id: expect.any(String), slug: 'chest', name: 'peito' },
}

describe('Given a seeded database', () => {
  describe("When add_muscle registers 'peitoral maior' in 'chest' through /mcp", () => {
    it("Then GET /api/muscles should list 'peitoral maior' linked to the chest group", async () => {
      const app = createSeededApp()

      await callTool(app, 'add_muscle', { name: 'peitoral maior', muscleGroupSlug: 'chest' })
      const response = await app.request('/api/muscles')

      expect(await response.json()).toEqual({ muscles: [PEITORAL_MAIOR] })
    })

    it('Then should return the muscle as structured content and as JSON text', async () => {
      const app = createSeededApp()

      const called = await callTool(app, 'add_muscle', {
        name: 'peitoral maior',
        muscleGroupSlug: 'chest',
      })
      const text = called.result?.content?.[0]?.text ?? 'null'

      expect({
        structuredContent: called.result?.structuredContent,
        text: JSON.parse(text),
      }).toEqual({ structuredContent: PEITORAL_MAIOR, text: PEITORAL_MAIOR })
    })
  })

  describe('When add_muscle is called without muscleGroupSlug', () => {
    it("Then should return an error result with code muscle_group_required and message 'informe o grupo muscular'", async () => {
      const app = createSeededApp()

      const called = await callTool(app, 'add_muscle', { name: 'peitoral maior' })

      expect({
        isError: called.result?.isError,
        error: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
      }).toEqual({
        isError: true,
        error: { code: 'muscle_group_required', message: 'informe o grupo muscular' },
      })
    })
  })
})

const ABS = { id: expect.any(String), slug: 'abs', name: 'abdômen' }

const PRANCHA = {
  id: expect.any(String),
  slug: 'prancha',
  name: 'Prancha',
  kind: 'time',
  muscles: [
    {
      id: expect.any(String),
      slug: 'reto-abdominal',
      name: 'reto abdominal',
      role: 'primary',
      muscleGroup: ABS,
    },
  ],
  muscleGroups: [ABS],
}

const PRANCHA_INPUT = { name: 'Prancha', kind: 'time', primaryMuscleSlugs: ['reto-abdominal'] }

describe("Given 'reto abdominal' in abs", () => {
  async function createAppWithRetoAbdominal(): Promise<ReturnType<typeof createApp>> {
    const app = createSeededApp()
    await callTool(app, 'add_muscle', { name: 'reto abdominal', muscleGroupSlug: 'abs' })
    return app
  }

  describe("When add_exercise registers 'Prancha' of kind time through /mcp", () => {
    it("Then GET /api/exercises should list 'Prancha' of kind time linked to the group abdômen", async () => {
      const app = await createAppWithRetoAbdominal()

      await callTool(app, 'add_exercise', PRANCHA_INPUT)
      const response = await app.request('/api/exercises')

      expect(await response.json()).toEqual({ exercises: [PRANCHA] })
    })

    it('Then should return the exercise as structured content and as JSON text', async () => {
      const app = await createAppWithRetoAbdominal()

      const called = await callTool(app, 'add_exercise', PRANCHA_INPUT)
      const text = called.result?.content?.[0]?.text ?? 'null'

      expect({
        structuredContent: called.result?.structuredContent,
        text: JSON.parse(text),
      }).toEqual({ structuredContent: PRANCHA, text: PRANCHA })
    })
  })

  describe('When add_exercise is called without primaryMuscleSlugs', () => {
    it("Then should return an error result with code exercise_muscle_required and message 'informe ao menos um músculo'", async () => {
      const app = await createAppWithRetoAbdominal()

      const called = await callTool(app, 'add_exercise', { name: 'Prancha', kind: 'time' })

      expect({
        isError: called.result?.isError,
        error: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
      }).toEqual({
        isError: true,
        error: { code: 'exercise_muscle_required', message: 'informe ao menos um músculo' },
      })
    })
  })
})

describe('Given a database that fails unexpectedly', () => {
  describe('When add_muscle is called', () => {
    it('Then should log the error and return code internal_error without the internal detail', async () => {
      const db = createTestDatabase()
      runSeed(db)
      const app = createMcpAuthorizedApp(
        createApp({ nodeEnv: 'development', databaseHealth: () => true, db }),
        db,
      )
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      db.$client.exec('DROP TABLE muscles')

      const called = await callTool(app, 'add_muscle', {
        name: 'peitoral maior',
        muscleGroupSlug: 'chest',
      })

      expect({
        isError: called.result?.isError,
        text: called.result?.content?.[0]?.text,
        logged: consoleError.mock.calls.length > 0,
      }).toEqual({
        isError: true,
        text: JSON.stringify({ code: 'internal_error', message: 'erro interno do servidor' }),
        logged: true,
      })
    })
  })
})
