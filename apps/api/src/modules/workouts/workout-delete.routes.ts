import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { deleteWorkoutById } from './workout-removal.service.js'
import { WorkoutIdParamsSchema } from './workouts.schemas.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const deleteWorkoutRoute = createRoute({
  method: 'delete',
  path: '/api/workouts/{workoutId}',
  tags: ['workouts'],
  summary:
    'Remove a workout with its sets and the exercises left out. The phone confirms before the call, so the route takes no confirmation code',
  request: { params: WorkoutIdParamsSchema },
  responses: {
    204: { description: 'The workout was removed' },
    400: { description: 'Id that is not a UUID (invalid_request)', content: errorContent },
    401: UNAUTHENTICATED_RESPONSE,
    403: {
      description: 'Origin other than the app origin (forbidden_origin)',
      content: errorContent,
    },
    404: { description: 'No such workout (workout_not_found)', content: errorContent },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createWorkoutDeleteRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(deleteWorkoutRoute, (c) => {
    deleteWorkoutById(db, c.req.valid('param').workoutId)
    return c.body(null, 204)
  })

  return routes
}
