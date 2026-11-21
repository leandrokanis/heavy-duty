import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { createTestDatabase } from '../test/database.js'

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

describe('Given an app in development', () => {
  const app = createApp({ nodeEnv: 'development', databaseHealth: () => true })

  describe('When a client initializes a session on /mcp and lists tools', () => {
    it('Then should return an empty tool list', async () => {
      const initialized = await postJsonRpc(app, {
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'heavy-duty-spec', version: '0.0.0' },
        },
      })
      const listed = await postJsonRpc(app, { id: 2, method: 'tools/list', params: {} })

      expect({
        serverName: (initialized.result?.serverInfo as { name?: string } | undefined)?.name,
        tools: listed.result?.tools,
      }).toEqual({ serverName: 'heavy-duty', tools: [] })
    })
  })
})

describe('Given an app in development with a database', () => {
  const app = createApp({
    nodeEnv: 'development',
    databaseHealth: () => true,
    db: createTestDatabase(),
  })

  describe('When tools/list is called on /mcp', () => {
    it('Then should return the five catalog tools, none destructive', async () => {
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
      ])
    })
  })
})
