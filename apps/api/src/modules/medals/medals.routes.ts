import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { listMedals } from './medal.service.js'
import { MedalsSchema } from './medals.schemas.js'

const listMedalsRoute = createRoute({
  method: 'get',
  path: '/api/medals',
  tags: ['medals'],
  summary:
    'Get the catalog of the medals with the award of each one, storing first the medals the history reached since the last read',
  responses: {
    200: {
      description:
        'The 10 medals in catalog order, each with its award (awardedAt, the instant of the event; subject, the muscle group of a level medal; workoutId) or null fields when not awarded; a hidden medal not yet awarded comes with no name, criterion nor icon',
      content: { 'application/json': { schema: MedalsSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: {
      description: 'Unexpected error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
})

export function createMedalsRoutes({
  db,
  now,
  timeZone,
}: {
  db: Database
  now: () => Date
  timeZone: string
}): OpenAPIHono {
  const routes = createRouter()
  routes.openapi(listMedalsRoute, (c) => c.json(listMedals(db, now(), timeZone), 200))
  return routes
}
