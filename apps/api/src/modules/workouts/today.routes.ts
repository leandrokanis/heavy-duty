import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { getToday } from './today.service.js'
import { TodaySchema } from './workouts.schemas.js'

const getTodayRoute = createRoute({
  method: 'get',
  path: '/api/today',
  tags: ['workouts'],
  summary:
    'Show the active program days in plan order, the suggested letter and each planned exercise with its prefilled load',
  responses: {
    200: {
      description:
        'The workout of the day, with a null program and no days when no program is active',
      content: { 'application/json': { schema: TodaySchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

export function createTodayRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(getTodayRoute, (c) => c.json(getToday(db), 200))

  return routes
}
