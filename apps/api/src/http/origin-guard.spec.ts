import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { createTestDatabase } from '../test/database.js'
import { createSessionCookie } from '../test/session.js'

function createSignedInRequest(origin?: string) {
  const db = createTestDatabase()
  const app = createApp({
    nodeEnv: 'test',
    databaseHealth: () => true,
    db,
    appOrigin: 'http://localhost:8080',
  })
  const cookie = createSessionCookie(db)
  const headers: Record<string, string> = { cookie }
  if (origin) headers.origin = origin
  return { app, cookie, headers }
}

describe('Given a valid session cookie and APP_ORIGIN http://localhost:8080', () => {
  describe('When DELETE /api/auth/session is requested with Origin https://evil.example', () => {
    it('Then should respond 403 with code forbidden_origin, and GET /api/auth/session should still respond 200', async () => {
      const { app, cookie, headers } = createSignedInRequest('https://evil.example')

      const response = await app.request('/api/auth/session', { method: 'DELETE', headers })
      const session = await app.request('/api/auth/session', { headers: { cookie } })

      expect({
        status: response.status,
        body: await response.json(),
        sessionStatus: session.status,
      }).toEqual({
        status: 403,
        body: { code: 'forbidden_origin', message: 'origem não permitida' },
        sessionStatus: 200,
      })
    })
  })

  describe('When DELETE /api/auth/session is requested with Origin http://localhost:8080.evil.example', () => {
    it('Then should respond 403, because the origin must match exactly', async () => {
      const { app, headers } = createSignedInRequest('http://localhost:8080.evil.example')

      const response = await app.request('/api/auth/session', { method: 'DELETE', headers })

      expect(response.status).toBe(403)
    })
  })

  describe('When DELETE /api/auth/session is requested with Origin http://localhost:8080', () => {
    it('Then should respond 204', async () => {
      const { app, headers } = createSignedInRequest('http://localhost:8080')

      const response = await app.request('/api/auth/session', { method: 'DELETE', headers })

      expect(response.status).toBe(204)
    })
  })

  describe('When DELETE /api/auth/session is requested without Origin', () => {
    it('Then should respond 204', async () => {
      const { app, headers } = createSignedInRequest()

      const response = await app.request('/api/auth/session', { method: 'DELETE', headers })

      expect(response.status).toBe(204)
    })
  })

  describe('When GET /api/auth/session is requested with Origin https://evil.example', () => {
    it('Then should respond 200, because reads are not refused by the origin guard', async () => {
      const { app, headers } = createSignedInRequest('https://evil.example')

      const response = await app.request('/api/auth/session', { headers })

      expect(response.status).toBe(200)
    })
  })
})

describe('Given no session cookie and APP_ORIGIN http://localhost:8080', () => {
  describe('When POST /api/auth/sign-in/options is requested with Origin https://evil.example', () => {
    it('Then should respond 403 with code forbidden_origin', async () => {
      const app = createApp({
        nodeEnv: 'test',
        databaseHealth: () => true,
        db: createTestDatabase(),
        appOrigin: 'http://localhost:8080',
      })

      const response = await app.request('/api/auth/sign-in/options', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 403,
        body: { code: 'forbidden_origin', message: 'origem não permitida' },
      })
    })
  })
})
