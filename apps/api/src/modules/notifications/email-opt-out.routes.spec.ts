import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { unsubscribeTokenHashOf } from './email-opt-out.service.js'
import { isEmailEnabled } from './email-settings.service.js'
import { claimNotification, finishNotification } from './notification.repository.js'

const APP_ORIGIN = 'https://heavy.example.com'
const TOKEN = 'dG9rZW4tb2YtdGhlLWVtYWlsLW9mLWxldHRlci1iLXRvZGF5'
const PATH = '/api/email/unsubscribe'

// A request with no cookie, as the athlete opening the link or the email client posting.
function createPublicApp() {
  const db = createTestDatabase()
  const app = createApp({
    nodeEnv: 'test',
    databaseHealth: () => true,
    db,
    appOrigin: APP_ORIGIN,
    now: () => new Date('2026-11-25T12:00:00.000Z'),
  })
  return { app, db }
}

function givenEmailSent(
  db: Database,
  channel: 'push' | 'email' = 'email',
  token: string = TOKEN,
): void {
  const id = createId(Date.parse('2026-11-24T00:00:00.000Z'))
  claimNotification(db, {
    id,
    noticeKey: 'window_close:B:2026-11-24T13:00:00.000Z',
    kind: 'window_close',
    channel,
    letter: 'B',
    muscleGroupSlugs: '["back","biceps"]',
    dueAt: '2026-11-24T00:00:00.000Z',
    eventAt: '2026-11-24T13:00:00.000Z',
    createdAt: '2026-11-24T00:00:00.000Z',
  })
  finishNotification(db, id, {
    status: 'sent',
    error: null,
    finishedAt: '2026-11-24T00:00:01.000Z',
    unsubscribeTokenHash: unsubscribeTokenHashOf(token),
  })
}

function postJson(app: ReturnType<typeof createPublicApp>['app'], body: unknown) {
  return app.request(PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP_ORIGIN },
    body: JSON.stringify(body),
  })
}

describe('Given an email sent with the token of the link to turn the emails off (US-F17-04)', () => {
  describe('When the page posts the token, with no session', () => {
    it('Then should answer 204 and turn the emails off', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await postJson(app, { token: TOKEN })

      expect([response.status, isEmailEnabled(db)]).toEqual([204, false])
    })
  })

  describe('When the email client posts the one-click unsubscribe of RFC 8058, with no Origin', () => {
    it('Then should answer 204 and turn the emails off', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await app.request(`${PATH}?token=${TOKEN}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      })

      expect([response.status, isEmailEnabled(db)]).toEqual([204, false])
    })
  })

  describe('When the link is opened with GET, as an email filter does', () => {
    it('Then should answer 401, as any other protected route, and keep the emails on', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await app.request(`${PATH}?token=${TOKEN}`)

      expect([response.status, isEmailEnabled(db)]).toEqual([401, true])
    })
  })

  describe('When a post comes from another site', () => {
    it('Then should answer 403 and keep the emails on', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await app.request(PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.example.com' },
        body: JSON.stringify({ token: TOKEN }),
      })

      expect([response.status, isEmailEnabled(db)]).toEqual([403, true])
    })
  })
})

describe('Given no email sent with the token', () => {
  describe.each([
    ['an unknown token', { token: 'dW5rbm93bi10b2tlbg' }],
    ['a token longer than 64 characters', { token: 'a'.repeat(65) }],
    ['no token', {}],
  ])('When the page posts %s', (_name, body) => {
    it('Then should answer 204, as with a valid token, and keep the emails on', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await postJson(app, body)

      expect([response.status, isEmailEnabled(db)]).toEqual([204, true])
    })
  })

  describe('When the token is the one of a push notice', () => {
    it('Then should keep the emails on', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db, 'push')

      await postJson(app, { token: TOKEN })

      expect(isEmailEnabled(db)).toBe(true)
    })
  })
})

describe('Given a body larger than 1 KiB', () => {
  describe('When it is posted', () => {
    it('Then should answer 413 and keep the emails on', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await postJson(app, { token: TOKEN, padding: 'x'.repeat(1100) })

      expect([response.status, isEmailEnabled(db)]).toEqual([413, true])
    })
  })
})

describe('Given an email sent with the token, and a post with no body', () => {
  describe('When the token comes only in the URL', () => {
    it('Then should answer 204 and turn the emails off', async () => {
      const { app, db } = createPublicApp()
      givenEmailSent(db)

      const response = await app.request(`${PATH}?token=${TOKEN}`, { method: 'POST' })

      expect([response.status, isEmailEnabled(db)]).toEqual([204, false])
    })
  })
})
