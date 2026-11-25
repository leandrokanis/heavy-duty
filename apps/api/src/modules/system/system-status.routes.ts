import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { SystemStatusSchema } from './system.schemas.js'
import { getSystemStatus, type NoticeChannelsConfigured } from './system-status.service.js'

const getSystemStatusRoute = createRoute({
  method: 'get',
  path: '/api/system/status',
  tags: ['system'],
  summary:
    'Report the backup status and the delivery of the notices by channel: configured, last send and recent failures',
  responses: {
    200: {
      description:
        'The backup status, with null runs when no backup ran yet, and the push and email channels of the notices',
      content: { 'application/json': { schema: SystemStatusSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

export function createSystemStatusRoutes(
  db: Database,
  noticeChannels: NoticeChannelsConfigured,
): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(getSystemStatusRoute, (c) => c.json(getSystemStatus(db, noticeChannels), 200))

  return routes
}
