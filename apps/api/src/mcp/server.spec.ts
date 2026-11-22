import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { createTestDatabase } from '../test/database.js'
import { createMcpAuthorizedApp } from '../test/mcp-auth.js'

type JsonRpcResponse = { result?: Record<string, unknown>; error?: unknown }

type ListedTool = {
  name: string
  description?: string
  inputSchema?: unknown
  outputSchema?: unknown
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
}

const INITIALIZE_REQUEST = {
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'heavy-duty-spec', version: '0.0.0' },
  },
}

async function postJsonRpc(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
): Promise<JsonRpcResponse> {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', ...body }),
  })
  return (await response.json()) as JsonRpcResponse
}

describe('Given an app in development without a database', () => {
  const app = createApp({ nodeEnv: 'development', databaseHealth: () => false })

  describe('When a client posts initialize to /mcp', () => {
    it('Then should respond 404, because no credential can be checked', async () => {
      const response = await app.request('/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', ...INITIALIZE_REQUEST }),
      })

      expect(response.status).toBe(404)
    })
  })
})

describe('Given an app in development with a database and an MCP credential', () => {
  const db = createTestDatabase()
  const app = createMcpAuthorizedApp(
    createApp({ nodeEnv: 'development', databaseHealth: () => true, db }),
    db,
  )

  describe('When initialize and tools/list are called on /mcp', () => {
    it('Then should return the catalog tools, the eleven program tools, get_system_status and list_workouts, with only remove_program_day and remove_planned_exercise destructive', async () => {
      await postJsonRpc(app, INITIALIZE_REQUEST)
      const listed = await postJsonRpc(app, { id: 2, method: 'tools/list', params: {} })
      const tools = (listed.result?.tools ?? []) as ListedTool[]

      expect(
        tools.map((tool) => ({
          name: tool.name,
          hasDescription: Boolean(tool.description),
          hasSchemas: Boolean(tool.inputSchema) && Boolean(tool.outputSchema),
          readOnly: tool.annotations?.readOnlyHint === true,
          destructive: tool.annotations?.destructiveHint === true,
        })),
      ).toEqual([
        {
          name: 'list_muscle_groups',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
        {
          name: 'list_muscles',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
        {
          name: 'add_muscle',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'list_exercises',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
        {
          name: 'add_exercise',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'create_program',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'add_program_day',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'add_planned_exercise',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'update_program',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'activate_program',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'update_program_day',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'remove_program_day',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: true,
        },
        {
          name: 'update_planned_exercise',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: false,
        },
        {
          name: 'remove_planned_exercise',
          hasDescription: true,
          hasSchemas: true,
          readOnly: false,
          destructive: true,
        },
        {
          name: 'get_program',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
        {
          name: 'list_programs',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
        {
          name: 'get_system_status',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
        {
          name: 'list_workouts',
          hasDescription: true,
          hasSchemas: true,
          readOnly: true,
          destructive: false,
        },
      ])
    })
  })
})
