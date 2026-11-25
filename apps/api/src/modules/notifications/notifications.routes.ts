import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import {
  PushKeySchema,
  PushSubscriptionBodySchema,
  PushSubscriptionEndpointBodySchema,
} from './notifications.schemas.js'
import {
  getPushKey,
  removePushSubscription,
  savePushSubscription,
} from './push-subscription.service.js'

const errorContent = { 'application/json': { schema: ErrorSchema } }

const writeErrorResponses = {
  400: { description: 'Body outside the schema (invalid_request)', content: errorContent },
  401: UNAUTHENTICATED_RESPONSE,
  403: {
    description: 'Origin other than the app origin (forbidden_origin)',
    content: errorContent,
  },
  500: { description: 'Unexpected error', content: errorContent },
} as const

const getPushKeyRoute = createRoute({
  method: 'get',
  path: '/api/notifications/push-key',
  tags: ['notifications'],
  summary: 'Get the public VAPID key to subscribe to push notices, and whether push is configured',
  responses: {
    200: {
      description: 'Whether the server can send push notices, with the public key when it can',
      content: { 'application/json': { schema: PushKeySchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const savePushSubscriptionRoute = createRoute({
  method: 'put',
  path: '/api/notifications/push-subscriptions',
  tags: ['notifications'],
  summary:
    'Store the push subscription of this browser by its endpoint. Sending it again refreshes the keys',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: PushSubscriptionBodySchema } },
    },
  },
  responses: {
    204: { description: 'The subscription is stored' },
    ...writeErrorResponses,
  },
})

const removePushSubscriptionRoute = createRoute({
  method: 'delete',
  path: '/api/notifications/push-subscriptions',
  tags: ['notifications'],
  summary: 'Remove the push subscription of this browser by its endpoint',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: PushSubscriptionEndpointBodySchema } },
    },
  },
  responses: {
    204: { description: 'No subscription with this endpoint is left, removed now or before' },
    ...writeErrorResponses,
  },
})

export function createNotificationsRoutes({
  db,
  now,
  pushPublicKey,
}: {
  db: Database
  now: () => Date
  pushPublicKey: string | undefined
}): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(getPushKeyRoute, (c) => c.json(getPushKey(pushPublicKey), 200))

  routes.openapi(savePushSubscriptionRoute, (c) => {
    savePushSubscription(db, c.req.valid('json'), now())
    return c.body(null, 204)
  })

  routes.openapi(removePushSubscriptionRoute, (c) => {
    removePushSubscription(db, c.req.valid('json').endpoint)
    return c.body(null, 204)
  })

  return routes
}
