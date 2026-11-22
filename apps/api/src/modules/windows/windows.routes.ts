import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { listActivityWindows } from './window-state.service.js'
import { ActivityWindowsSchema } from './windows.schemas.js'

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

export function createWindowsRoutes({ db, now }: { db: Database; now: () => Date }): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(listWindowsRoute, (c) => c.json(listActivityWindows(db, now()), 200))

  return routes
}
