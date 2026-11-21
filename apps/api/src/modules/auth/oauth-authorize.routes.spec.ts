import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createTestDatabase } from '../../test/database.js'
import { createSessionCookie } from '../../test/session.js'

const APP_ORIGIN = 'https://hd.example'
const CALLBACK = 'https://claude.example/callback'

const CLIENT_UNKNOWN = {
  code: 'oauth_client_unknown',
  message: 'Cliente do MCP desconhecido. Conecte o cliente de novo.',
}

const REDIRECT_URI_INVALID = {
  code: 'oauth_redirect_uri_invalid',
  message: 'Endereço de retorno não registrado por este cliente do MCP.',
}

async function givenRegisteredClient() {
  const db = createTestDatabase()
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db,
    appOrigin: APP_ORIGIN,
  })
  const registered = await app.request('/api/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Claude',
      redirect_uris: [CALLBACK, 'http://127.0.0.1:3199/callback'],
    }),
  })
  const { client_id: clientId } = (await registered.json()) as { client_id: string }
  return { db, app, clientId, cookie: createSessionCookie(db) }
}

function authorizationParams(
  clientId: string,
  overrides: Record<string, string | null | undefined> = {},
) {
  const params: Record<string, string | null | undefined> = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CALLBACK,
    code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    code_challenge_method: 'S256',
    state: 'xyz',
    resource: 'https://hd.example/mcp',
    scope: 'anything',
    ...overrides,
  }
  return new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

async function preview(
  app: ReturnType<typeof createApp>,
  params: URLSearchParams,
  cookie?: string,
) {
  const response = await app.request(`/api/oauth/authorization?${params}`, {
    headers: cookie ? { cookie } : {},
  })
  return { status: response.status, body: (await response.json()) as Record<string, string> }
}

describe('Given a registered client and an access session', () => {
  describe('When the screen asks for the preview of a valid request', () => {
    it('Then should answer consent with the declared name and the redirect host', async () => {
      const { app, clientId, cookie } = await givenRegisteredClient()

      const response = await preview(app, authorizationParams(clientId), cookie)

      expect(response).toEqual({
        status: 200,
        body: { kind: 'consent', clientName: 'Claude', redirectHost: 'claude.example' },
      })
    })
  })

  describe.each([
    {
      case: 'without code_challenge',
      overrides: { code_challenge: null },
      error: 'invalid_request',
    },
    {
      case: 'with the plain method',
      overrides: { code_challenge_method: 'plain' },
      error: 'invalid_request',
    },
    {
      case: 'without code_challenge_method',
      overrides: { code_challenge_method: null },
      error: 'invalid_request',
    },
    {
      case: 'with response_type token',
      overrides: { response_type: 'token' },
      error: 'invalid_request',
    },
    {
      case: 'for another resource',
      overrides: { resource: 'https://other.example/mcp' },
      error: 'invalid_target',
    },
    {
      case: 'for the resource with a trailing slash',
      overrides: { resource: 'https://hd.example/mcp/' },
      error: 'invalid_target',
    },
  ])('When the screen asks for the preview $case', ({ overrides, error }) => {
    it(`Then should tell the screen to redirect with error=${error} and the state`, async () => {
      const { app, clientId, cookie } = await givenRegisteredClient()

      const response = await preview(app, authorizationParams(clientId, overrides), cookie)

      expect(response).toEqual({
        status: 200,
        body: { kind: 'error_redirect', redirectTo: `${CALLBACK}?error=${error}&state=xyz` },
      })
    })
  })

  describe('When the screen asks for the preview without resource', () => {
    it('Then should answer consent, because the resource indicator is optional', async () => {
      const { app, clientId, cookie } = await givenRegisteredClient()

      const response = await preview(app, authorizationParams(clientId, { resource: null }), cookie)

      expect(response.body.kind).toBe('consent')
    })
  })

  describe.each([
    { case: 'an unknown client', overrides: { client_id: 'unknown' }, body: CLIENT_UNKNOWN },
    { case: 'no client_id', overrides: { client_id: null }, body: CLIENT_UNKNOWN },
    {
      case: 'a redirect_uri on another host',
      overrides: { redirect_uri: 'https://evil.example/callback' },
      body: REDIRECT_URI_INVALID,
    },
    {
      case: 'a registered redirect_uri plus a path suffix',
      overrides: { redirect_uri: `${CALLBACK}/x` },
      body: REDIRECT_URI_INVALID,
    },
    {
      case: 'the loopback redirect_uri on another port',
      overrides: { redirect_uri: 'http://127.0.0.1:4000/callback' },
      body: REDIRECT_URI_INVALID,
    },
    { case: 'no redirect_uri', overrides: { redirect_uri: null }, body: REDIRECT_URI_INVALID },
  ])('When the screen asks for the preview with $case', ({ overrides, body }) => {
    it('Then should answer 400 with the error and no redirectTo', async () => {
      const { app, clientId, cookie } = await givenRegisteredClient()

      const response = await preview(app, authorizationParams(clientId, overrides), cookie)

      expect(response).toEqual({ status: 400, body })
    })
  })

  describe('When the preview is asked without the session cookie', () => {
    it('Then should answer 401 unauthenticated', async () => {
      const { app, clientId } = await givenRegisteredClient()

      const response = await preview(app, authorizationParams(clientId))

      expect(response).toEqual({
        status: 401,
        body: { code: 'unauthenticated', message: 'Entre com a sua chave de acesso.' },
      })
    })
  })
})

async function decide(
  app: ReturnType<typeof createApp>,
  body: Record<string, string>,
  headers: Record<string, string>,
) {
  const response = await app.request('/api/oauth/authorization', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json()) as Record<string, string> }
}

function decisionBody(
  clientId: string,
  decision: 'approve' | 'deny',
  overrides: Record<string, string | null | undefined> = {},
) {
  return { ...Object.fromEntries(authorizationParams(clientId, overrides)), decision }
}

function readCodesAndApproval(db: ReturnType<typeof createTestDatabase>, clientId: string) {
  return {
    codeHashes: (
      db.$client.prepare('SELECT code_hash FROM oauth_authorization_codes').all() as {
        code_hash: string
      }[]
    ).map((row) => row.code_hash),
    approvedAt: (
      db.$client.prepare('SELECT approved_at FROM oauth_clients WHERE id = ?').get(clientId) as {
        approved_at: string | null
      }
    ).approved_at,
  }
}

describe('Given a valid authorization request and an access session', () => {
  describe('When the PO approves', () => {
    it('Then redirectTo should carry a code and the same state, the client should be approved and only the hash of the code should be stored', async () => {
      const { app, db, clientId, cookie } = await givenRegisteredClient()

      const response = await decide(app, decisionBody(clientId, 'approve'), {
        cookie,
        origin: APP_ORIGIN,
      })
      const redirectTo = new URL(response.body.redirectTo ?? '')
      const code = redirectTo.searchParams.get('code') ?? ''
      const stored = readCodesAndApproval(db, clientId)

      expect({
        status: response.status,
        target: `${redirectTo.origin}${redirectTo.pathname}`,
        params: [...redirectTo.searchParams.keys()],
        state: redirectTo.searchParams.get('state'),
        codeLength: code.length,
        storedCodes: stored.codeHashes.length,
        codeStoredInClear: stored.codeHashes.includes(code),
        approved: stored.approvedAt !== null,
      }).toEqual({
        status: 200,
        target: CALLBACK,
        params: ['code', 'state'],
        state: 'xyz',
        codeLength: 43,
        storedCodes: 1,
        codeStoredInClear: false,
        approved: true,
      })
    })
  })

  describe('When the PO denies', () => {
    it('Then redirectTo should carry error=access_denied and the state, and no code should be stored', async () => {
      const { app, db, clientId, cookie } = await givenRegisteredClient()

      const response = await decide(app, decisionBody(clientId, 'deny'), { cookie })

      expect({ response, stored: readCodesAndApproval(db, clientId) }).toEqual({
        response: {
          status: 200,
          body: { redirectTo: `${CALLBACK}?error=access_denied&state=xyz` },
        },
        stored: { codeHashes: [], approvedAt: null },
      })
    })
  })

  describe('When the approval comes with the Origin of another site', () => {
    it('Then should answer 403 forbidden_origin and store no code', async () => {
      const { app, db, clientId, cookie } = await givenRegisteredClient()

      const response = await decide(app, decisionBody(clientId, 'approve'), {
        cookie,
        origin: 'https://evil.example',
      })

      expect({ response, codes: readCodesAndApproval(db, clientId).codeHashes }).toEqual({
        response: {
          status: 403,
          body: { code: 'forbidden_origin', message: 'origem não permitida' },
        },
        codes: [],
      })
    })
  })

  describe('When the approval names a redirect_uri the client did not register', () => {
    it('Then should answer 400 oauth_redirect_uri_invalid and store no code', async () => {
      const { app, db, clientId, cookie } = await givenRegisteredClient()

      const response = await decide(
        app,
        decisionBody(clientId, 'approve', { redirect_uri: 'https://evil.example/callback' }),
        { cookie },
      )

      expect({ response, codes: readCodesAndApproval(db, clientId).codeHashes }).toEqual({
        response: { status: 400, body: REDIRECT_URI_INVALID },
        codes: [],
      })
    })
  })

  describe('When the approval comes without PKCE', () => {
    it('Then redirectTo should carry error=invalid_request and no code should be stored', async () => {
      const { app, db, clientId, cookie } = await givenRegisteredClient()

      const response = await decide(
        app,
        decisionBody(clientId, 'approve', { code_challenge: null }),
        { cookie },
      )

      expect({ response, codes: readCodesAndApproval(db, clientId).codeHashes }).toEqual({
        response: {
          status: 200,
          body: { redirectTo: `${CALLBACK}?error=invalid_request&state=xyz` },
        },
        codes: [],
      })
    })
  })

  describe('When the approval comes without the session cookie', () => {
    it('Then should answer 401 unauthenticated and store no code', async () => {
      const { app, db, clientId } = await givenRegisteredClient()

      const response = await decide(app, decisionBody(clientId, 'approve'), {})

      expect({
        status: response.status,
        codes: readCodesAndApproval(db, clientId).codeHashes,
      }).toEqual({
        status: 401,
        codes: [],
      })
    })
  })
})
