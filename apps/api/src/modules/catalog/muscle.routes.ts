import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema } from '../../http/errors.js'
import { AddMuscleInputSchema, MuscleListSchema, MuscleSchema } from './catalog.schemas.js'
import { addMuscle, listMuscles } from './muscle.service.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const listMusclesRoute = createRoute({
  method: 'get',
  path: '/api/muscles',
  tags: ['catalog'],
  summary: 'List the registered muscles with their muscle group',
  responses: {
    200: {
      description: 'The muscles ordered by slug',
      content: { 'application/json': { schema: MuscleListSchema } },
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const addMuscleRoute = createRoute({
  method: 'post',
  path: '/api/muscles',
  tags: ['catalog'],
  summary: 'Register a muscle in a muscle group',
  request: {
    body: { required: true, content: { 'application/json': { schema: AddMuscleInputSchema } } },
  },
  responses: {
    201: {
      description: 'The registered muscle',
      content: { 'application/json': { schema: MuscleSchema } },
    },
    400: {
      description:
        'Missing muscle group (muscle_group_required) or missing name (muscle_name_required)',
      content: errorContent,
    },
    409: {
      description: 'A muscle with the same name already exists (muscle_already_exists)',
      content: errorContent,
    },
    422: {
      description: 'The muscle group is not in the catalog (muscle_group_not_found)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createMuscleRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(listMusclesRoute, (c) => c.json(listMuscles(db), 200))
  routes.openapi(addMuscleRoute, (c) => c.json(addMuscle(db, c.req.valid('json')), 201))

  return routes
}
