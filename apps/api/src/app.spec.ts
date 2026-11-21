import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createTestDatabase } from './test/database.js'

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

describe('Given an app in production with a database', () => {
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db: createTestDatabase(),
  })

  describe('When the catalog routes and /mcp are requested', () => {
    it('Then should respond 404 to each', async () => {
      const requests = [
        app.request('/api/muscle-groups'),
        app.request('/api/muscles'),
        app.request('/api/muscles', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'peitoral maior', muscleGroupSlug: 'chest' }),
        }),
        app.request('/mcp', { method: 'POST' }),
      ]
      const statuses = (await Promise.all(requests)).map((response) => response.status)

      expect(statuses).toEqual([404, 404, 404, 404])
    })
  })
})

describe('Given an app in development with a database', () => {
  const app = createApp({
    nodeEnv: 'development',
    databaseHealth: () => true,
    db: createTestDatabase(),
  })

  describe('When the OpenAPI document is generated', () => {
    it('Then should declare GET /api/muscle-groups, GET /api/muscles and POST /api/muscles', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as {
        paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
      }
      const responseCodes = (path: string, method: string) =>
        Object.keys(document.paths[path]?.[method]?.responses ?? {}).sort()

      expect({
        listMuscleGroups: responseCodes('/api/muscle-groups', 'get'),
        listMuscles: responseCodes('/api/muscles', 'get'),
        addMuscle: responseCodes('/api/muscles', 'post'),
      }).toEqual({
        listMuscleGroups: ['200', '500'],
        listMuscles: ['200', '500'],
        addMuscle: ['201', '400', '409', '422', '500'],
      })
    })
  })
})
