import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createId } from '../../db/id.js'
import { insertBackupRun } from '../../modules/system/backup-run.repository.js'
import { createTestDatabase } from '../../test/database.js'

type JsonRpcResponse = { result?: { structuredContent?: unknown; isError?: boolean } }

async function callTool(app: ReturnType<typeof createApp>, name: string): Promise<JsonRpcResponse> {
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
      params: { name, arguments: {} },
    }),
  })
  return (await response.json()) as JsonRpcResponse
}

describe('Given a failed backup run in the database', () => {
  describe('When get_system_status is called through /mcp', () => {
    it('Then structuredContent should equal the body of GET /api/system/status', async () => {
      const db = createTestDatabase()
      insertBackupRun(db, {
        id: createId(),
        startedAt: '2026-11-21T06:00:00.000Z',
        finishedAt: '2026-11-21T06:00:02.000Z',
        status: 'failed',
        sizeBytes: null,
        error: 'offsite copy failed: repository does not exist',
      })
      const app = createApp({ nodeEnv: 'development', databaseHealth: () => true, db })

      const called = await callTool(app, 'get_system_status')
      const response = await app.request('/api/system/status')

      expect(called.result?.structuredContent).toEqual(await response.json())
    })
  })
})
