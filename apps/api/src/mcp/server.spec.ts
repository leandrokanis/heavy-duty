import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'

type JsonRpcResponse = { result?: Record<string, unknown>; error?: unknown }

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
