import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { listWorkouts } from './workout-history.service.js'
import { ListWorkoutsQuerySchema, WorkoutHistorySchema } from './workouts.schemas.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const listWorkoutsRoute = createRoute({
  method: 'get',
  path: '/api/workouts',
  tags: ['workouts'],
  summary:
    'List the workouts that started in a UTC interval, from inclusive to exclusive, oldest first, with sets and the exercises left out',
  request: { query: ListWorkoutsQuerySchema },
  responses: {
    200: {
      description: 'The workouts of the interval, an empty list when none started in it',
      content: { 'application/json': { schema: WorkoutHistorySchema } },
    },
    400: {
      description:
        'Missing or malformed from or to (workout_range_required), to not after from (workout_range_inverted) or interval above 92 days (workout_range_too_long)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createWorkoutHistoryRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(listWorkoutsRoute, (c) => c.json(listWorkouts(db, c.req.valid('query')), 200))

  return routes
}
