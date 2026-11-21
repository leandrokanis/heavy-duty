import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema } from '../../http/errors.js'
import { MuscleGroupListSchema } from './catalog.schemas.js'
import { listMuscleGroups } from './muscle-group.service.js'

const listMuscleGroupsRoute = createRoute({
  method: 'get',
  path: '/api/muscle-groups',
  tags: ['catalog'],
  summary: 'List the muscle groups in catalog order',
  responses: {
    200: {
      description: 'The muscle groups ordered by position',
      content: { 'application/json': { schema: MuscleGroupListSchema } },
    },
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

export function createMuscleGroupRoutes(db: Database): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(listMuscleGroupsRoute, (c) => c.json(listMuscleGroups(db), 200))

  return routes
}
