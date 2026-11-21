import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { createProgram } from '../modules/programs/program.service.js'
import { createTestDatabase } from '../test/database.js'
import { createMcpAccessToken } from '../test/mcp-auth.js'
import { createSessionCookie } from '../test/session.js'

const APP_ORIGIN = 'https://hd.example'
const RESOURCE_METADATA_URL = 'https://hd.example/.well-known/oauth-protected-resource/mcp'

const MCP_UNAUTHENTICATED_BODY = {
  code: 'mcp_unauthenticated',
  message: 'credencial do MCP ausente ou inválida',
}

const JSON_RPC_REQUESTS = {
  initialize: {
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'heavy-duty-spec', version: '0.0.0' },
    },
  },
  'tools/list': { method: 'tools/list', params: {} },
  'tools/call': { method: 'tools/call', params: { name: 'list_programs', arguments: {} } },
} as const

type JsonRpcMethod = keyof typeof JSON_RPC_REQUESTS

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

// The request comes through an allowed host other than hd.example, so the URL cannot come from Host.
async function postMcp(
  app: ReturnType<typeof createApp>,
  method: JsonRpcMethod,
  options: { path?: string; authorization?: string; host?: string } = {},
) {
  const headers: Record<string, string> = {
    host: options.host ?? 'localhost:3001',
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  }
  if (options.authorization) headers.authorization = options.authorization
  const response = await app.request(options.path ?? '/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...JSON_RPC_REQUESTS[method] }),
  })
  return {
    status: response.status,
    wwwAuthenticate: response.headers.get('www-authenticate'),
    body: (await response.json()) as { result?: { structuredContent?: unknown } },
  }
}

const METHODS: JsonRpcMethod[] = ['initialize', 'tools/list', 'tools/call']

describe('Given an app in production with a database and APP_ORIGIN https://hd.example', () => {
  describe.each(METHODS)('When %s reaches /mcp', (method) => {
    it.each([
      { case: 'without an Authorization header', authorization: undefined },
      { case: 'with the Basic scheme', authorization: 'Basic dXNlcjpwYXNz' },
    ])(
      'Then $case should answer 401 pointing to the resource metadata, with no data',
      async ({ authorization }) => {
        const { app } = givenProductionApp()

        const response = await postMcp(app, method, { authorization })

        expect(response).toEqual({
          status: 401,
          wwwAuthenticate: `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
          body: MCP_UNAUTHENTICATED_BODY,
        })
      },
    )

    it('Then with an unknown Bearer token should answer 401 with error="invalid_token", with no data', async () => {
      const { app } = givenProductionApp()

      const response = await postMcp(app, method, { authorization: 'Bearer unknown-token' })

      expect(response).toEqual({
        status: 401,
        wwwAuthenticate: `Bearer resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token"`,
        body: MCP_UNAUTHENTICATED_BODY,
      })
    })

    it('Then with a valid credential in the query string should treat it as missing and answer 401', async () => {
      const { app, db } = givenProductionApp()
      const token = createMcpAccessToken(db, { appOrigin: APP_ORIGIN })

      const response = await postMcp(app, method, { path: `/mcp?access_token=${token}` })

      expect(response).toEqual({
        status: 401,
        wwwAuthenticate: `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
        body: MCP_UNAUTHENTICATED_BODY,
      })
    })

    it('Then with a credential issued for another resource should answer 401 with error="invalid_token"', async () => {
      const { app, db } = givenProductionApp()
      const token = createMcpAccessToken(db, {
        appOrigin: APP_ORIGIN,
        resource: 'https://other.example/mcp',
      })

      const response = await postMcp(app, method, { authorization: `Bearer ${token}` })

      expect(response).toEqual({
        status: 401,
        wwwAuthenticate: `Bearer resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token"`,
        body: MCP_UNAUTHENTICATED_BODY,
      })
    })
  })
})

describe('Given a program and a credential issued for https://hd.example/mcp', () => {
  function givenProgramAndCredential() {
    const { db, app } = givenProductionApp()
    createProgram(db, { name: 'Programa 1', goal: 'hypertrophy' }, new Date())
    return { db, app, token: createMcpAccessToken(db, { appOrigin: APP_ORIGIN }) }
  }

  describe('When the client calls list_programs with Authorization: Bearer', () => {
    it('Then should list the program with the same result as GET /api/programs', async () => {
      const { db, app, token } = givenProgramAndCredential()

      const called = await postMcp(app, 'tools/call', { authorization: `Bearer ${token}` })
      const listed = await app.request('/api/programs', {
        headers: { cookie: createSessionCookie(db) },
      })

      expect({
        status: called.status,
        structuredContent: called.body.result?.structuredContent,
      }).toEqual({ status: 200, structuredContent: await listed.json() })
    })
  })

  describe('When the same credential comes with a Host outside the allowed list', () => {
    it('Then should answer 403 forbidden_host', async () => {
      const { app, token } = givenProgramAndCredential()

      const response = await postMcp(app, 'tools/call', {
        authorization: `Bearer ${token}`,
        host: 'evil.example',
      })

      expect({ status: response.status, body: response.body }).toEqual({
        status: 403,
        body: { code: 'forbidden_host', message: 'host não permitido' },
      })
    })
  })

  describe('When a request without a credential comes with a Host outside the allowed list', () => {
    it('Then should answer 403 forbidden_host, because the host guard runs first', async () => {
      const { app } = givenProgramAndCredential()

      const response = await postMcp(app, 'tools/call', { host: 'evil.example' })

      expect({ status: response.status, body: response.body }).toEqual({
        status: 403,
        body: { code: 'forbidden_host', message: 'host não permitido' },
      })
    })
  })
})
