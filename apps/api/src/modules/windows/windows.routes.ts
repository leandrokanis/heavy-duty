import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { listMuscleGroupLevels } from './progress.service.js'
import { listActivityWindows } from './window-state.service.js'
import { ActivityWindowsSchema, MuscleGroupLevelsSchema } from './windows.schemas.js'

const listWindowsRoute = createRoute({
  method: 'get',
  path: '/api/windows',
  tags: ['windows'],
  summary:
    'Get the state of the activity window of each muscle group now: resting, open, cooling or none',
  responses: {
    200: {
      description:
        'The 11 muscle groups in catalog order, each with its state and the instants of its last training and window, null when the group was never trained',
      content: { 'application/json': { schema: ActivityWindowsSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

const listLevelsRoute = createRoute({
  method: 'get',
  path: '/api/levels',
  tags: ['windows'],
  summary: 'Get the level of each muscle group now, with the points on its bar',
  responses: {
    200: {
      description:
        'The 11 muscle groups in catalog order, each with its level (1 to 20), the points on the bar, the cost of the level, the best level and the tier; a group never trained is at level 1 with 0 points',
      content: { 'application/json': { schema: MuscleGroupLevelsSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

export function createWindowsRoutes({ db, now }: { db: Database; now: () => Date }): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(listWindowsRoute, (c) => c.json(listActivityWindows(db, now()), 200))
  routes.openapi(listLevelsRoute, (c) => c.json(listMuscleGroupLevels(db, now()), 200))

  return routes
}
