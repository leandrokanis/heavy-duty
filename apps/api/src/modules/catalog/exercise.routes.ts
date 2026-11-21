import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { AddExerciseInputSchema, ExerciseListSchema, ExerciseSchema } from './catalog.schemas.js'
import { addExercise, listExercises } from './exercise.service.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const listExercisesRoute = createRoute({
  method: 'get',
  path: '/api/exercises',
  tags: ['catalog'],
  summary: 'List the active exercises with their muscles and muscle groups',
  responses: {
    200: {
      description: 'The active exercises ordered by slug',
      content: { 'application/json': { schema: ExerciseListSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const addExerciseRoute = createRoute({
  method: 'post',
  path: '/api/exercises',
  tags: ['catalog'],
  summary: 'Register a reps or time exercise with the muscles it works',
  request: {
    body: { required: true, content: { 'application/json': { schema: AddExerciseInputSchema } } },
  },
  responses: {
    201: {
      description: 'The registered exercise',
      content: { 'application/json': { schema: ExerciseSchema } },
    },
    400: {
      description:
        'Missing name (exercise_name_required), missing kind (exercise_kind_required), kind other than reps or time (exercise_kind_invalid), no primary muscle (exercise_muscle_required) or a muscle given twice (exercise_muscle_duplicated)',
      content: errorContent,
    },
    409: {
      description: 'An exercise with the same name already exists (exercise_already_exists)',
      content: errorContent,
    },
    422: {
      description: 'A muscle is not in the catalog (muscle_not_found)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createExerciseRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(listExercisesRoute, (c) => c.json(listExercises(db), 200))
  routes.openapi(addExerciseRoute, (c) => c.json(addExercise(db, c.req.valid('json')), 201))

  return routes
}
