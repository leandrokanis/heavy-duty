import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createTestDatabase } from '../../test/database.js'
import { createMcpAccessToken } from '../../test/mcp-auth.js'
import { createSessionCookie } from '../../test/session.js'

const APP_ORIGIN = 'https://hd.example'

function givenProductionApp() {
  const db = createTestDatabase()
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db,
    appOrigin: APP_ORIGIN,
  })
  return { db, app }
}

describe('Given a valid access session', () => {
  describe('When the client calls /mcp with only the hd_session cookie', () => {
    it('Then should answer 401 mcp_unauthenticated', async () => {
      const { db, app } = givenProductionApp()

      const response = await app.request('/mcp', {
        method: 'POST',
        headers: {
          host: 'localhost:3001',
          cookie: createSessionCookie(db),
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 401,
        body: { code: 'mcp_unauthenticated', message: 'credencial do MCP ausente ou inválida' },
      })
    })
  })
})

describe('Given a valid MCP credential', () => {
  describe('When the client calls GET /api/programs with only Authorization: Bearer', () => {
    it('Then should answer 401 unauthenticated', async () => {
      const { db, app } = givenProductionApp()
      const token = createMcpAccessToken(db, { appOrigin: APP_ORIGIN })

      const response = await app.request('/api/programs', {
        headers: { authorization: `Bearer ${token}` },
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 401,
        body: { code: 'unauthenticated', message: 'Entre com a sua chave de acesso.' },
      })
    })
  })
})
