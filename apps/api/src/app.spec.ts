import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'

describe('Given an app in production', () => {
  const app = createApp({ nodeEnv: 'production', databaseHealth: () => true })

  describe('When /api/docs, /api/openapi.json and /mcp are requested', () => {
    it('Then should respond 404 to each', async () => {
      const requests = [
        app.request('/api/docs'),
        app.request('/api/openapi.json'),
        app.request('/mcp', { method: 'POST' }),
      ]
      const statuses = (await Promise.all(requests)).map((response) => response.status)

      expect(statuses).toEqual([404, 404, 404])
    })
  })
})
