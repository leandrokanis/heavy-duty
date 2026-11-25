import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createTestDatabase } from '../../test/database.js'
import { createTestClock } from '../../test/programs.js'
import { createSessionCookie, withSessionCookie } from '../../test/session.js'
import { listPushSubscriptions } from './push-subscription.repository.js'

const APP_ORIGIN = 'http://localhost:8080'
// A placeholder: the API serves the public key as it is configured.
const PUBLIC_KEY = 'test-public-key'
const ENDPOINT = 'https://push.example.test/send/abc'
const KEYS = { p256dh: 'BPublicKeyOfTheBrowser', auth: 'AuthSecret' }
const SUBSCRIPTIONS_PATH = '/api/notifications/push-subscriptions'

function createNotificationsTestApp(pushPublicKey?: string) {
  const db = createTestDatabase()
  const clock = createTestClock()
  const app = createApp({
    nodeEnv: 'test',
    databaseHealth: () => true,
    db,
    now: clock.now,
    appOrigin: APP_ORIGIN,
    pushPublicKey,
  })
  return { db, clock, app, signedIn: withSessionCookie(app, createSessionCookie(db, clock.now())) }
}

function jsonRequest(method: 'PUT' | 'DELETE', body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json', origin: APP_ORIGIN },
    body: JSON.stringify(body),
  }
}

function storedSubscriptions(db: ReturnType<typeof createTestDatabase>) {
  return listPushSubscriptions(db).map(({ endpoint, p256dh, auth, createdAt, updatedAt }) => ({
    endpoint,
    p256dh,
    auth,
    createdAt,
    updatedAt,
  }))
}

describe('Given the push channel is configured', () => {
  describe('When GET /api/notifications/push-key is called with a session', () => {
    it('Then should respond 200 with configured true and the public key', async () => {
      const { signedIn } = createNotificationsTestApp(PUBLIC_KEY)

      const response = await signedIn.request('/api/notifications/push-key')

      expect([response.status, await response.json()]).toEqual([
        200,
        { configured: true, publicKey: PUBLIC_KEY },
      ])
    })
  })

  describe('When GET /api/notifications/push-key is called without a session', () => {
    it('Then should respond 401 without the key', async () => {
      const { app } = createNotificationsTestApp(PUBLIC_KEY)

      const response = await app.request('/api/notifications/push-key')

      expect([response.status, JSON.stringify(await response.json()).includes(PUBLIC_KEY)]).toEqual(
        [401, false],
      )
    })
  })
})

describe('Given the push channel is not configured', () => {
  describe('When GET /api/notifications/push-key is called', () => {
    it('Then should respond 200 with configured false and no key', async () => {
      const { signedIn } = createNotificationsTestApp()

      const response = await signedIn.request('/api/notifications/push-key')

      expect([response.status, await response.json()]).toEqual([
        200,
        { configured: false, publicKey: null },
      ])
    })
  })
})

describe('Given no push subscription', () => {
  describe('When PUT /api/notifications/push-subscriptions is called with a subscription', () => {
    it('Then should respond 204 and store it with the instant of the API', async () => {
      const { db, clock, signedIn } = createNotificationsTestApp(PUBLIC_KEY)

      const response = await signedIn.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('PUT', { endpoint: ENDPOINT, keys: KEYS }),
      )

      const at = clock.now().toISOString()
      expect([response.status, storedSubscriptions(db)]).toEqual([
        204,
        [{ endpoint: ENDPOINT, ...KEYS, createdAt: at, updatedAt: at }],
      ])
    })
  })

  describe('When PUT is called with an endpoint that is not https', () => {
    it('Then should respond 400 and store nothing', async () => {
      const { db, signedIn } = createNotificationsTestApp(PUBLIC_KEY)

      const response = await signedIn.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('PUT', { endpoint: 'http://127.0.0.1:3001/api/health', keys: KEYS }),
      )

      expect([response.status, storedSubscriptions(db)]).toEqual([400, []])
    })
  })

  describe('When PUT is called without a session', () => {
    it('Then should respond 401 and store nothing', async () => {
      const { db, app } = createNotificationsTestApp(PUBLIC_KEY)

      const response = await app.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('PUT', { endpoint: ENDPOINT, keys: KEYS }),
      )

      expect([response.status, storedSubscriptions(db)]).toEqual([401, []])
    })
  })

  describe('When DELETE is called with an endpoint', () => {
    it('Then should respond 204', async () => {
      const { signedIn } = createNotificationsTestApp(PUBLIC_KEY)

      const response = await signedIn.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('DELETE', { endpoint: ENDPOINT }),
      )

      expect(response.status).toBe(204)
    })
  })
})

describe('Given a stored push subscription', () => {
  async function givenStored() {
    const testApp = createNotificationsTestApp(PUBLIC_KEY)
    await testApp.signedIn.request(
      SUBSCRIPTIONS_PATH,
      jsonRequest('PUT', { endpoint: ENDPOINT, keys: KEYS }),
    )
    return testApp
  }

  describe('When the same endpoint comes again with new keys a minute later', () => {
    it('Then should keep one row with the new keys, the first creation and the new update', async () => {
      const { db, clock, signedIn } = await givenStored()
      const createdAt = clock.now().toISOString()
      clock.advance(60_000)
      const newKeys = { p256dh: 'BOtherPublicKey', auth: 'OtherSecret' }

      const response = await signedIn.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('PUT', { endpoint: ENDPOINT, keys: newKeys }),
      )

      expect([response.status, storedSubscriptions(db)]).toEqual([
        204,
        [{ endpoint: ENDPOINT, ...newKeys, createdAt, updatedAt: clock.now().toISOString() }],
      ])
    })
  })

  describe('When DELETE is called with its endpoint', () => {
    it('Then should respond 204 and remove it', async () => {
      const { db, signedIn } = await givenStored()

      const response = await signedIn.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('DELETE', { endpoint: ENDPOINT }),
      )

      expect([response.status, storedSubscriptions(db)]).toEqual([204, []])
    })
  })

  describe('When DELETE is called with another endpoint', () => {
    it('Then should respond 204 and keep it', async () => {
      const { db, signedIn } = await givenStored()

      const response = await signedIn.request(
        SUBSCRIPTIONS_PATH,
        jsonRequest('DELETE', { endpoint: 'https://push.example.test/send/other' }),
      )

      expect([response.status, storedSubscriptions(db).length]).toEqual([204, 1])
    })
  })
})
