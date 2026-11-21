import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app.js'

describe('Given an app whose database probe reports up', () => {
  const app = createApp({ nodeEnv: 'test', databaseHealth: () => true })

  describe('When GET /api/health is requested', () => {
    it('Then should respond 200 with status ok and database up', async () => {
      const response = await app.request('/api/health')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 200,
        body: { status: 'ok', database: 'up' },
      })
    })
  })
})

describe('Given an app whose database probe fails', () => {
  const app = createApp({ nodeEnv: 'test', databaseHealth: () => false })

  describe('When GET /api/health is requested', () => {
    it('Then should respond 503 with database down', async () => {
      const response = await app.request('/api/health')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 503,
        body: { status: 'unavailable', database: 'down' },
      })
    })
  })
  describe('and the probe throws', () => {
    const throwingApp = createApp({
      nodeEnv: 'test',
      databaseHealth: () => {
        throw new Error('database is locked')
      },
    })

    describe('When GET /api/health is requested', () => {
      it('Then should respond 503 with database down', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const response = await throwingApp.request('/api/health')

        expect({ status: response.status, body: await response.json() }).toEqual({
          status: 503,
          body: { status: 'unavailable', database: 'down' },
        })
      })
    })
  })
})
