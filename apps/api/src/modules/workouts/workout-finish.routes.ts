import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { finishWorkout } from './workout-finish.service.js'
import {
  FinishWorkoutBodySchema,
  WorkoutIdParamsSchema,
  WorkoutSchema,
} from './workouts.schemas.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const finishWorkoutRoute = createRoute({
  method: 'post',
  path: '/api/workouts/{workoutId}/finish',
  tags: ['workouts'],
  summary:
    'Record how and when a workout ended. Sending the same instant and reason again changes nothing',
  request: {
    params: WorkoutIdParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: FinishWorkoutBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'The workout with its end, recorded now or by an earlier identical request',
      content: { 'application/json': { schema: WorkoutSchema } },
    },
    400: {
      description:
        'Body outside the schema (invalid_request), reason other than completed or ended_early (workout_end_reason_invalid), instant that is not UTC ISO 8601 (workout_finished_at_invalid) or instant before the start (workout_finished_before_start)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    403: {
      description: 'Origin other than the app origin (forbidden_origin)',
      content: errorContent,
    },
    404: { description: 'No such workout (workout_not_found)', content: errorContent },
    409: {
      description:
        'The workout already ended with another instant or reason (workout_already_finished)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createWorkoutFinishRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(finishWorkoutRoute, (c) =>
    c.json(finishWorkout(db, c.req.valid('param').workoutId, c.req.valid('json')), 200),
  )

  return routes
}
