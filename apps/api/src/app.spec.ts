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

  describe('When the catalog routes, /api/system/status and /mcp are requested', () => {
    it('Then should respond 404 to each', async () => {
      const requests = [
        app.request('/api/muscle-groups'),
        app.request('/api/muscles'),
        app.request('/api/muscles', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'peitoral maior', muscleGroupSlug: 'chest' }),
        }),
        app.request('/api/exercises'),
        app.request('/api/exercises', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Supino reto',
            kind: 'reps',
            primaryMuscleSlugs: ['peitoral-maior'],
          }),
        }),
        app.request('/api/system/status'),
        app.request('/mcp', { method: 'POST' }),
      ]
      const statuses = (await Promise.all(requests)).map((response) => response.status)

      expect(statuses).toEqual([404, 404, 404, 404, 404, 404, 404])
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
    it('Then should declare the catalog routes, with GET /api/exercises answering 200 and 500 and POST /api/exercises answering 201, 400, 409, 422 and 500', async () => {
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
        listExercises: responseCodes('/api/exercises', 'get'),
        addExercise: responseCodes('/api/exercises', 'post'),
      }).toEqual({
        listMuscleGroups: ['200', '500'],
        listMuscles: ['200', '500'],
        addMuscle: ['201', '400', '409', '422', '500'],
        listExercises: ['200', '500'],
        addExercise: ['201', '400', '409', '422', '500'],
      })
    })
  })

  describe('When the OpenAPI document is generated for the system status', () => {
    it('Then should declare GET /api/system/status with 200 and 500', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as {
        paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
      }

      expect(
        Object.keys(document.paths['/api/system/status']?.get?.responses ?? {}).sort(),
      ).toEqual(['200', '500'])
    })
  })
})
