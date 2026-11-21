import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { recordWorkoutSet } from './workout-set.service.js'
import {
  RecordWorkoutSetBodySchema,
  WorkoutIdParamsSchema,
  WorkoutSetSchema,
} from './workouts.schemas.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }
const workoutSetContent = { 'application/json': { schema: WorkoutSetSchema } }

const recordWorkoutSetRoute = createRoute({
  method: 'post',
  path: '/api/workouts/{workoutId}/sets',
  tags: ['workouts'],
  summary:
    'Record a set with the id generated on the phone; the first set of a workout creates the workout. Sending the same id with the same values again records nothing new',
  request: {
    params: WorkoutIdParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: RecordWorkoutSetBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'A set with this id already exists with the same values; the stored set',
      content: workoutSetContent,
    },
    201: {
      description: 'The recorded set; the workout was created if it did not exist',
      content: workoutSetContent,
    },
    400: {
      description:
        'Body outside the schema (invalid_request), letter other than A to Z (program_day_letter_invalid), negative load (workout_set_load_invalid), reps below 1 (workout_set_reps_invalid), seconds below 1 (workout_set_seconds_invalid), no measure, both measures or the measure of the other kind (workout_set_measure_invalid), set number below 1 (workout_set_number_invalid) or exercise other than the one of the planned exercise (workout_set_exercise_mismatch)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    403: {
      description: 'Origin other than the app origin (forbidden_origin)',
      content: errorContent,
    },
    409: {
      description:
        'The workout id exists with another program, letter or start (workout_conflict), the set id exists with other values or in another workout (workout_set_id_conflict) or the workout already has this set number for the exercise (workout_set_duplicated)',
      content: errorContent,
    },
    422: {
      description:
        'No such program (program_not_found), no such letter in the program (program_day_not_found) or no such planned exercise in the letter (planned_exercise_not_found)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createWorkoutSetRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(recordWorkoutSetRoute, (c) => {
    const { set, created } = recordWorkoutSet(
      db,
      c.req.valid('param').workoutId,
      c.req.valid('json'),
    )
    return created ? c.json(set, 201) : c.json(set, 200)
  })

  return routes
}
