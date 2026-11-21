import { createRoute, z } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import { createRouter, handleError } from './errors.js'

describe('Given an app', () => {
  const app = createApp({ nodeEnv: 'test', databaseHealth: () => true })

  describe('When an unknown path is requested', () => {
    it('Then should respond 404 with code not_found and a message', async () => {
      const response = await app.request('/api/unknown')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'not_found', message: expect.any(String) },
      })
    })
  })
})

describe('Given a router with a route that validates its query', () => {
  const router = createRouter()
  router.openapi(
    createRoute({
      method: 'get',
      path: '/items',
      request: { query: z.object({ limit: z.coerce.number().int().positive() }) },
      responses: { 200: { description: 'Items' } },
    }),
    (c) => c.body(null, 200),
  )

  describe('When the query is invalid', () => {
    it('Then should respond 400 with code invalid_request and a message', async () => {
      const response = await router.request('/items?limit=zero')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'invalid_request', message: expect.any(String) },
      })
    })
  })
})

describe('Given a router with a route that throws an unexpected error', () => {
  const router = createRouter()
  router.get('/boom', () => {
    throw new Error('unexpected failure')
  })
  router.onError(handleError)

  describe('When the route is requested', () => {
    it('Then should respond 500 with code internal_error and a message', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const response = await router.request('/boom')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 500,
        body: { code: 'internal_error', message: expect.any(String) },
      })
    })
  })
})
