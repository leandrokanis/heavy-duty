import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { createTestDatabase } from '../../test/database.js'
import {
  approveFlowCode,
  FLOW_CALLBACK,
  FLOW_CODE_VERIFIER,
  FLOW_OTHER_CALLBACK,
  mcpChallenge,
  postToken,
  registerFlowClient,
} from '../../test/oauth-flow.js'
import { createTestClock } from '../../test/programs.js'

const APP_ORIGIN = 'https://hd.example'
const RESOURCE = 'https://hd.example/mcp'
const START = new Date('2026-11-21T10:00:00.000Z')
const MINUTE_MS = 60 * 1000

async function givenIssuedCode() {
  const db = createTestDatabase()
  const clock = createTestClock(START)
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db,
    appOrigin: APP_ORIGIN,
    now: clock.now,
  })
  const clientId = await registerFlowClient(app)
  const code = await approveFlowCode(app, db, { clientId, now: clock.now(), resource: RESOURCE })
  const exchange = (overrides: Record<string, string | null | undefined> = {}) => {
    const fields: Record<string, string | null | undefined> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: FLOW_CALLBACK,
      client_id: clientId,
      code_verifier: FLOW_CODE_VERIFIER,
      resource: RESOURCE,
      ...overrides,
    }
    return postToken(
      app,
      Object.fromEntries(
        Object.entries(fields).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      ),
    )
  }
  return { db, app, clock, clientId, code, exchange }
}

async function readResponse(response: Response) {
  return { status: response.status, body: await response.json() }
}

function grantColumns(db: Database): string[] {
  return (db.$client.prepare('SELECT * FROM oauth_grants').all() as Record<string, unknown>[])
    .flatMap((row) => Object.values(row))
    .map(String)
}

describe('Given a code issued after the approval', () => {
  describe('When the client exchanges it with the right code_verifier', () => {
    it('Then should answer 200 no-store with a Bearer credential of 3600 seconds and a refresh token, and the credential should open /mcp', async () => {
      const { app, exchange } = await givenIssuedCode()

      const response = await exchange()
      const body = (await response.json()) as Record<string, unknown>
      const opened = await mcpChallenge(app, String(body.access_token))

      expect({
        status: response.status,
        cacheControl: response.headers.get('cache-control'),
        body,
        mcpStatus: opened.status,
      }).toEqual({
        status: 200,
        cacheControl: 'no-store',
        body: {
          access_token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
        },
        mcpStatus: 200,
      })
    })

    it('Then the database should keep neither the code nor the credential nor the refresh token in clear', async () => {
      const { db, code, exchange } = await givenIssuedCode()

      const body = (await (await exchange()).json()) as Record<string, string>
      const stored = [
        ...grantColumns(db),
        ...(
          db.$client.prepare('SELECT * FROM oauth_authorization_codes').all() as Record<
            string,
            unknown
          >[]
        ).flatMap((row) => Object.values(row).map(String)),
      ]

      expect(
        [code, body.access_token, body.refresh_token].filter((value) =>
          stored.includes(value ?? ''),
        ),
      ).toEqual([])
    })
  })

  describe.each([
    { case: 'with a wrong code_verifier', overrides: { code_verifier: 'x'.repeat(43) } },
    {
      case: 'with another registered redirect_uri',
      overrides: { redirect_uri: FLOW_OTHER_CALLBACK },
    },
  ])('When the client exchanges it $case', ({ overrides }) => {
    it('Then should answer 400 invalid_grant and issue no credential', async () => {
      const { db, exchange } = await givenIssuedCode()

      const response = await readResponse(await exchange(overrides))

      expect({ response, grants: grantColumns(db) }).toEqual({
        response: {
          status: 400,
          body: { error: 'invalid_grant', error_description: expect.any(String) },
        },
        grants: [],
      })
    })
  })

  describe('When the client exchanges it a second time', () => {
    it('Then should answer 400 invalid_grant', async () => {
      const { exchange } = await givenIssuedCode()
      await exchange()

      const response = await readResponse(await exchange())

      expect(response).toEqual({
        status: 400,
        body: { error: 'invalid_grant', error_description: expect.any(String) },
      })
    })
  })

  describe('When another registered client presents it', () => {
    it('Then should answer 400 invalid_grant and issue no credential', async () => {
      const { app, db, exchange } = await givenIssuedCode()
      const otherClientId = await registerFlowClient(app, 'other')

      const response = await readResponse(await exchange({ client_id: otherClientId }))

      expect({ response, grants: grantColumns(db) }).toEqual({
        response: {
          status: 400,
          body: { error: 'invalid_grant', error_description: expect.any(String) },
        },
        grants: [],
      })
    })
  })

  describe('When the client exchanges it 5 minutes later', () => {
    it('Then should answer 400 invalid_grant and issue no credential', async () => {
      const { db, clock, exchange } = await givenIssuedCode()
      clock.advance(5 * MINUTE_MS)

      const response = await readResponse(await exchange())

      expect({ response, grants: grantColumns(db) }).toEqual({
        response: {
          status: 400,
          body: { error: 'invalid_grant', error_description: expect.any(String) },
        },
        grants: [],
      })
    })
  })

  describe.each([
    {
      case: 'an unknown client_id',
      overrides: { client_id: 'unknown' },
      status: 401,
      error: 'invalid_client',
    },
    { case: 'no client_id', overrides: { client_id: null }, status: 401, error: 'invalid_client' },
    {
      case: 'another resource',
      overrides: { resource: 'https://other.example/mcp' },
      status: 400,
      error: 'invalid_target',
    },
    {
      case: 'the password grant type',
      overrides: { grant_type: 'password' },
      status: 400,
      error: 'unsupported_grant_type',
    },
    {
      case: 'no grant_type',
      overrides: { grant_type: null },
      status: 400,
      error: 'invalid_request',
    },
    {
      case: 'no code_verifier',
      overrides: { code_verifier: null },
      status: 400,
      error: 'invalid_request',
    },
  ])('When the client exchanges it with $case', ({ overrides, status, error }) => {
    it(`Then should answer ${status} ${error} and issue no credential`, async () => {
      const { db, exchange } = await givenIssuedCode()

      const response = await readResponse(await exchange(overrides))

      expect({ response, grants: grantColumns(db) }).toEqual({
        response: { status, body: { error, error_description: expect.any(String) } },
        grants: [],
      })
    })
  })

  describe('When the token body is larger than 16 KiB', () => {
    it('Then should answer 413 and issue no credential', async () => {
      const { db, exchange } = await givenIssuedCode()

      const response = await exchange({ padding: 'a'.repeat(17 * 1024) })

      expect({ status: response.status, grants: grantColumns(db) }).toEqual({
        status: 413,
        grants: [],
      })
    })
  })
})

const RESOURCE_METADATA_CHALLENGE =
  'Bearer resource_metadata="https://hd.example/.well-known/oauth-protected-resource/mcp"'

async function givenCredentialIssuedAtStart() {
  const given = await givenIssuedCode()
  const tokens = (await (await given.exchange()).json()) as {
    access_token: string
    refresh_token: string
  }
  const refresh = (refreshToken: string, clientId = given.clientId) =>
    postToken(given.app, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      resource: RESOURCE,
    })
  return { ...given, tokens, refresh }
}

describe('Given a credential issued 61 minutes ago', () => {
  describe('When the client calls /mcp with it', () => {
    it('Then should answer 401 with error="invalid_token"', async () => {
      const { app, clock, tokens } = await givenCredentialIssuedAtStart()
      clock.advance(61 * MINUTE_MS)

      const response = await mcpChallenge(app, tokens.access_token)

      expect(response).toEqual({
        status: 401,
        wwwAuthenticate: `${RESOURCE_METADATA_CHALLENGE}, error="invalid_token"`,
      })
    })
  })

  describe('When the client renews with the refresh token', () => {
    it('Then should receive a new credential and refresh token that open /mcp, without a new approval', async () => {
      const { app, clock, tokens, refresh } = await givenCredentialIssuedAtStart()
      clock.advance(61 * MINUTE_MS)

      const response = await refresh(tokens.refresh_token)
      const renewed = (await response.json()) as Record<string, string>
      const opened = await mcpChallenge(app, renewed.access_token ?? '')

      expect({
        status: response.status,
        cacheControl: response.headers.get('cache-control'),
        rotated: renewed.refresh_token !== tokens.refresh_token,
        newCredential: renewed.access_token !== tokens.access_token,
        expiresIn: renewed.expires_in,
        mcpStatus: opened.status,
      }).toEqual({
        status: 200,
        cacheControl: 'no-store',
        rotated: true,
        newCredential: true,
        expiresIn: 3600,
        mcpStatus: 200,
      })
    })
  })

  describe('When the client presents the old refresh token again after the rotation', () => {
    it('Then should answer invalid_grant and the new credential should stop working too', async () => {
      const { app, clock, tokens, refresh } = await givenCredentialIssuedAtStart()
      clock.advance(61 * MINUTE_MS)
      const renewed = (await (await refresh(tokens.refresh_token)).json()) as Record<string, string>

      const reused = await readResponse(await refresh(tokens.refresh_token))
      const opened = await mcpChallenge(app, renewed.access_token ?? '')

      expect({ reused, mcpStatus: opened.status }).toEqual({
        reused: {
          status: 400,
          body: { error: 'invalid_grant', error_description: expect.any(String) },
        },
        mcpStatus: 401,
      })
    })
  })
})

describe('Given a refresh token issued 30 days ago and never used', () => {
  describe('When the client renews with it', () => {
    it('Then should answer invalid_grant', async () => {
      const { clock, tokens, refresh } = await givenCredentialIssuedAtStart()
      clock.advance(30 * 24 * 60 * MINUTE_MS)

      const response = await readResponse(await refresh(tokens.refresh_token))

      expect(response).toEqual({
        status: 400,
        body: { error: 'invalid_grant', error_description: expect.any(String) },
      })
    })
  })
})

describe('Given a refresh token of one client', () => {
  describe('When another registered client presents it', () => {
    it('Then should answer invalid_grant and the original credential should keep working', async () => {
      const { app, tokens, refresh } = await givenCredentialIssuedAtStart()
      const otherClientId = await registerFlowClient(app, 'other')

      const response = await readResponse(await refresh(tokens.refresh_token, otherClientId))
      const opened = await mcpChallenge(app, tokens.access_token)

      expect({ response, mcpStatus: opened.status }).toEqual({
        response: {
          status: 400,
          body: { error: 'invalid_grant', error_description: expect.any(String) },
        },
        mcpStatus: 200,
      })
    })
  })
})
