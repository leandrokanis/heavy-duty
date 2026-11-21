import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi'
import { createRouter, ErrorSchema } from '../../http/errors.js'
import { type DatabaseHealthProbe, getSystemHealth } from './health.service.js'

const HealthUpSchema = z
  .object({
    status: z.literal('ok'),
    database: z.literal('up'),
  })
  .openapi('HealthUp')

const HealthDownSchema = z
  .object({
    status: z.literal('unavailable'),
    database: z.literal('down'),
  })
  .openapi('HealthDown')

const getHealthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  tags: ['system'],
  summary: 'Report the API and database status',
  responses: {
    200: {
      description: 'The API is running and the database answers',
      content: { 'application/json': { schema: HealthUpSchema } },
    },
    503: {
      description: 'The API is running but the database does not answer',
      content: { 'application/json': { schema: HealthDownSchema } },
    },
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

export function createHealthRoutes(databaseHealth: DatabaseHealthProbe): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(getHealthRoute, (c) => {
    const health = getSystemHealth(databaseHealth)
    return health.status === 'ok' ? c.json(health, 200) : c.json(health, 503)
  })

  return routes
}
