import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { correctWorkoutSet } from './workout-set-correction.service.js'
import {
  CorrectWorkoutSetBodySchema,
  WorkoutSetParamsSchema,
  WorkoutSetSchema,
} from './workouts.schemas.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const correctWorkoutSetRoute = createRoute({
  method: 'patch',
  path: '/api/workouts/{workoutId}/sets/{setId}',
  tags: ['workouts'],
  summary:
    'Replace the load and the measure of a recorded set, also after the workout ended. Sending the same values again changes nothing',
  request: {
    params: WorkoutSetParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: CorrectWorkoutSetBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'The set with the values now stored',
      content: { 'application/json': { schema: WorkoutSetSchema } },
    },
    400: {
      description:
        'Body or ids outside the schema (invalid_request), negative load (workout_set_load_invalid), reps below 1 (workout_set_reps_invalid), seconds below 1 (workout_set_seconds_invalid) or no measure, both measures or the measure of the other kind (workout_set_measure_invalid)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    403: {
      description: 'Origin other than the app origin (forbidden_origin)',
      content: errorContent,
    },
    404: {
      description:
        'No such workout (workout_not_found) or no such set in the workout (workout_set_not_found)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createWorkoutSetCorrectionRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(correctWorkoutSetRoute, (c) => {
    const { workoutId, setId } = c.req.valid('param')
    return c.json(correctWorkoutSet(db, workoutId, setId, c.req.valid('json')), 200)
  })

  return routes
}
