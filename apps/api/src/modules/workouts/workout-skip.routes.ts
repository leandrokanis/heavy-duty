import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { recordWorkoutSkip } from './workout-skip.service.js'
import {
  RecordWorkoutSkipBodySchema,
  WorkoutIdParamsSchema,
  WorkoutSkipSchema,
} from './workouts.schemas.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const recordWorkoutSkipRoute = createRoute({
  method: 'post',
  path: '/api/workouts/{workoutId}/skips',
  tags: ['workouts'],
  summary: 'Record an exercise left out of a workout. Sending the same skip again changes nothing',
  request: {
    params: WorkoutIdParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: RecordWorkoutSkipBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'The skip recorded by an earlier identical request',
      content: { 'application/json': { schema: WorkoutSkipSchema } },
    },
    201: {
      description: 'The skip, recorded now',
      content: { 'application/json': { schema: WorkoutSkipSchema } },
    },
    400: {
      description:
        'Body outside the schema (invalid_request), instant that is not UTC ISO 8601 (workout_skipped_at_invalid) or instant before the start (workout_skipped_before_start)',
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
        'The exercise was already skipped in this workout at another instant or by another planned exercise (workout_skip_conflict)',
      content: errorContent,
    },
    422: {
      description:
        'Planned exercise missing or outside the letter of the workout (planned_exercise_not_found)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createWorkoutSkipRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(recordWorkoutSkipRoute, (c) => {
    const { skip, created } = recordWorkoutSkip(
      db,
      c.req.valid('param').workoutId,
      c.req.valid('json'),
    )
    return created ? c.json(skip, 201) : c.json(skip, 200)
  })

  return routes
}
