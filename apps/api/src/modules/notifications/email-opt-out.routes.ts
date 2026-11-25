import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema } from '../../http/errors.js'
import { turnEmailsOffByToken } from './email-opt-out.service.js'

export const EMAIL_UNSUBSCRIBE_PATH = '/api/email/unsubscribe'

const MAX_BODY_BYTES = 1024

const errorContent = { 'application/json': { schema: ErrorSchema } }

const TokenQuerySchema = z.object({
  token: z
    .string()
    .optional()
    .openapi({ description: 'Token of the email, from the List-Unsubscribe URL' }),
})

const TokenBodySchema = z
  .object({
    token: z.string().optional().openapi({ example: 'dG9rZW4tb2YtdGhlLWVtYWls' }),
  })
  .openapi('EmailUnsubscribeBody')

// RFC 8058: the email client posts List-Unsubscribe=One-Click to the URL of the header.
const OneClickBodySchema = z
  .object({ 'List-Unsubscribe': z.string().optional().openapi({ example: 'One-Click' }) })
  .openapi('EmailOneClickUnsubscribeBody')

const unsubscribeRoute = createRoute({
  method: 'post',
  path: EMAIL_UNSUBSCRIBE_PATH,
  tags: ['notifications'],
  summary: 'Turn the notices by email off with the token of the link in an email',
  security: [],
  request: {
    query: TokenQuerySchema,
    body: {
      required: false,
      content: {
        'application/json': { schema: TokenBodySchema },
        'application/x-www-form-urlencoded': { schema: OneClickBodySchema },
      },
    },
  },
  responses: {
    204: {
      description:
        'Always the same answer, with a valid, unknown or missing token; a valid token turns the emails off',
    },
    400: { description: 'Body that is not valid JSON (invalid_request)', content: errorContent },
    403: {
      description: 'Origin other than the app origin (forbidden_origin)',
      content: errorContent,
    },
    413: { description: 'Body larger than 1 KiB (payload_too_large)', content: errorContent },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export type EmailOptOutRoutesDeps = { db: Database; now: () => Date }

export function createEmailOptOutRoutes({ db, now }: EmailOptOutRoutesDeps): OpenAPIHono {
  const routes = createRouter()

  routes.use(
    EMAIL_UNSUBSCRIBE_PATH,
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ code: 'payload_too_large', message: 'corpo maior que 1 KiB' }, 413),
    }),
  )

  routes.openapi(unsubscribeRoute, (c) => {
    // The validator fills only the target of the content type sent, so the JSON body may be absent.
    const body: unknown = c.req.valid('json')
    const fromBody =
      typeof body === 'object' && body !== null && 'token' in body && typeof body.token === 'string'
        ? body.token
        : undefined
    turnEmailsOffByToken(db, fromBody ?? c.req.valid('query').token, now())
    return c.body(null, 204)
  })

  return routes
}
