import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { createTestDatabase } from '../../test/database.js'
import { createTestClock } from '../../test/programs.js'

const APP_ORIGIN = 'https://hd.example'
const START = new Date('2026-11-21T10:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

function givenAppWithoutCookie() {
  const db = createTestDatabase()
  const clock = createTestClock(START)
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db,
    appOrigin: APP_ORIGIN,
    now: clock.now,
  })
  return { db, app, clock }
}

async function register(app: ReturnType<typeof createApp>, body: unknown) {
  const response = await app.request('/api/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

function clientNames(db: Database): (string | null)[] {
  return (
    db.$client.prepare('SELECT client_name FROM oauth_clients ORDER BY created_at, id').all() as {
      client_name: string | null
    }[]
  ).map((row) => row.client_name)
}

const INVALID_REDIRECT_URI = {
  error: 'invalid_redirect_uri',
  error_description: 'redirect_uris must hold 1 to 5 https or loopback URIs without fragment',
}

describe('Given an app with a database and no session cookie', () => {
  describe('When a client registers https://claude.example/callback', () => {
    it('Then should answer 201 with a client_id and the public client metadata', async () => {
      const { app } = givenAppWithoutCookie()

      const response = await register(app, {
        client_name: 'Claude',
        redirect_uris: ['https://claude.example/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'client_secret_basic',
      })

      expect(response).toEqual({
        status: 201,
        body: {
          client_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          client_id_issued_at: START.getTime() / 1000,
          client_name: 'Claude',
          redirect_uris: ['https://claude.example/callback'],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        },
      })
    })
  })

  describe('When a client registers a loopback http redirect_uri with a port', () => {
    it('Then should answer 201', async () => {
      const { app } = givenAppWithoutCookie()

      const response = await register(app, { redirect_uris: ['http://127.0.0.1:3199/callback'] })

      expect(response.status).toBe(201)
    })
  })

  describe.each([
    { case: 'plain http outside loopback', redirectUris: ['http://evil.example/cb'] },
    { case: 'a fragment', redirectUris: ['https://claude.example/callback#x'] },
    { case: 'a custom scheme', redirectUris: ['javascript:alert(1)'] },
    { case: 'no redirect_uri', redirectUris: [] },
    {
      case: 'six redirect_uris',
      redirectUris: Array.from({ length: 6 }, (_, index) => `https://claude.example/cb${index}`),
    },
    {
      case: 'a redirect_uri over 2048 characters',
      redirectUris: [`https://claude.example/${'a'.repeat(2030)}`],
    },
  ])('When a client registers $case', ({ redirectUris }) => {
    it('Then should answer 400 invalid_redirect_uri and store nothing', async () => {
      const { app, db } = givenAppWithoutCookie()

      const response = await register(app, { redirect_uris: redirectUris })

      expect({ response, stored: clientNames(db) }).toEqual({
        response: { status: 400, body: INVALID_REDIRECT_URI },
        stored: [],
      })
    })
  })

  describe.each([
    {
      case: 'a client_name over 100 characters',
      body: { client_name: 'a'.repeat(101), redirect_uris: ['https://claude.example/cb'] },
    },
    {
      case: 'redirect_uris that is not a list',
      body: { redirect_uris: 'https://claude.example/cb' },
    },
    { case: 'a body that is not JSON', body: 'not json' },
  ])('When a client registers $case', ({ body }) => {
    it('Then should answer 400 invalid_client_metadata', async () => {
      const { app } = givenAppWithoutCookie()

      const response = await register(app, body)

      expect(response).toEqual({
        status: 400,
        body: { error: 'invalid_client_metadata', error_description: expect.any(String) },
      })
    })
  })

  describe('When the body is larger than 16 KiB', () => {
    it('Then should answer 413 and store nothing', async () => {
      const { app, db } = givenAppWithoutCookie()

      const response = await register(app, {
        client_name: 'Claude',
        redirect_uris: ['https://claude.example/callback'],
        padding: 'a'.repeat(17 * 1024),
      })

      expect({ status: response.status, stored: clientNames(db) }).toEqual({
        status: 413,
        stored: [],
      })
    })
  })
})

describe('Given an approved client and then 20 clients never approved', () => {
  async function givenFullTable() {
    const given = givenAppWithoutCookie()
    await register(given.app, { client_name: 'approved', redirect_uris: ['https://a.example/cb'] })
    given.db.$client.prepare('UPDATE oauth_clients SET approved_at = created_at').run()
    for (let index = 1; index <= 20; index++) {
      given.clock.advance(60_000)
      await register(given.app, {
        client_name: `pending-${index}`,
        redirect_uris: ['https://p.example/cb'],
      })
    }
    return given
  }

  describe('When the twenty-first never approved client registers', () => {
    it('Then the oldest never approved should leave, the approved one should stay and the new one should enter', async () => {
      const { app, db, clock } = await givenFullTable()
      clock.advance(60_000)

      const response = await register(app, {
        client_name: 'newest',
        redirect_uris: ['https://n.example/cb'],
      })

      expect({ status: response.status, stored: clientNames(db) }).toEqual({
        status: 201,
        stored: [
          'approved',
          ...Array.from({ length: 19 }, (_, index) => `pending-${index + 2}`),
          'newest',
        ],
      })
    })
  })
})

describe('Given a client never approved registered 25 hours ago and an approved one as old', () => {
  describe('When another client registers', () => {
    it('Then the stale never approved client should leave and the approved one should stay', async () => {
      const { app, db, clock } = givenAppWithoutCookie()
      await register(app, { client_name: 'approved', redirect_uris: ['https://a.example/cb'] })
      db.$client.prepare('UPDATE oauth_clients SET approved_at = created_at').run()
      await register(app, { client_name: 'stale', redirect_uris: ['https://s.example/cb'] })
      clock.advance(25 * HOUR_MS)

      await register(app, { client_name: 'fresh', redirect_uris: ['https://f.example/cb'] })

      expect(clientNames(db)).toEqual(['approved', 'fresh'])
    })
  })
})
