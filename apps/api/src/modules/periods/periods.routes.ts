import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { getCurrentPeriod, setPeriodIntention } from './period.service.js'
import { CurrentPeriodSchema, PeriodIntentionInputSchema } from './periods.schemas.js'

const UNEXPECTED_RESPONSE = {
  description: 'Unexpected error',
  content: { 'application/json': { schema: ErrorSchema } },
}

const currentPeriodRoute = createRoute({
  method: 'get',
  path: '/api/periods/current',
  tags: ['periods'],
  summary:
    'Get the current period of 12 weeks, with its intention, the goals of the period and the windows used by each muscle group in it',
  responses: {
    200: {
      description:
        'The period that holds now, with its start, its end (exclusive), the week of now (1 to 12), the intention (null with none), the windows used in the period against the target of 70%, the volume of the last complete week against week 1 against the target of +20% and the 11 muscle groups in catalog order with their windows used in the period',
      content: { 'application/json': { schema: CurrentPeriodSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: UNEXPECTED_RESPONSE,
  },
})

const periodIntentionRoute = createRoute({
  method: 'put',
  path: '/api/periods/current/intention',
  tags: ['periods'],
  summary: 'Write the intention of the current period; an empty text removes it',
  request: {
    body: { content: { 'application/json': { schema: PeriodIntentionInputSchema } } },
  },
  responses: {
    200: {
      description: 'The current period with the new intention',
      content: { 'application/json': { schema: CurrentPeriodSchema } },
    },
    400: {
      description:
        'Missing intention (period_intention_required) or longer than 120 characters (period_intention_too_long)',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: UNEXPECTED_RESPONSE,
  },
})

export function createPeriodsRoutes({
  db,
  now,
  timeZone,
}: {
  db: Database
  now: () => Date
  timeZone: string
}): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(currentPeriodRoute, (c) => c.json(getCurrentPeriod(db, now(), timeZone), 200))
  routes.openapi(periodIntentionRoute, (c) =>
    c.json(setPeriodIntention(db, c.req.valid('json'), now(), timeZone), 200),
  )

  return routes
}
