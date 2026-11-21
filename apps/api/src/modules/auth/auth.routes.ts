import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import {
  CeremonyOptionsSchema,
  EnrollmentRequestSchema,
  SessionSchema,
  SignInRequestSchema,
} from './auth.schemas.js'
import type { CeremonyDeps } from './ceremony.js'
import { finishEnrollment, startEnrollment } from './enrollment.service.js'
import { endSession } from './session.service.js'
import { clearSessionCookie, setSessionCookie } from './session-cookie.js'
import { finishSignIn, startSignIn } from './sign-in.service.js'

export type AuthRoutesDeps = CeremonyDeps & {
  appOrigin: string
}

const INTERNAL_ERROR_RESPONSE = {
  description: 'Unexpected error',
  content: { 'application/json': { schema: ErrorSchema } },
} as const

const FORBIDDEN_ORIGIN_RESPONSE = {
  description: 'The Origin header belongs to another site',
  content: { 'application/json': { schema: ErrorSchema } },
} as const

const enrollmentBody = {
  required: true,
  content: { 'application/json': { schema: EnrollmentRequestSchema } },
} as const

const signInBody = {
  required: true,
  content: { 'application/json': { schema: SignInRequestSchema } },
} as const

const enrollmentOptionsRoute = createRoute({
  method: 'post',
  path: '/api/auth/enrollment/options',
  tags: ['auth'],
  summary: 'Start the enrollment of a passkey with the token of an enrollment link',
  security: [],
  request: { body: enrollmentBody },
  responses: {
    200: {
      description: 'Options for navigator.credentials.create()',
      content: { 'application/json': { schema: CeremonyOptionsSchema } },
    },
    400: {
      description:
        'enrollment_token_invalid: the enrollment link expired, was used or does not exist',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    403: FORBIDDEN_ORIGIN_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const enrollmentVerifyRoute = createRoute({
  method: 'post',
  path: '/api/auth/enrollment/verify',
  tags: ['auth'],
  summary: 'Finish the enrollment, spend the enrollment link and open an access session',
  security: [],
  request: { body: enrollmentBody },
  responses: {
    201: {
      description: 'The passkey was stored and the hd_session cookie was set',
      content: { 'application/json': { schema: SessionSchema } },
    },
    400: {
      description: 'enrollment_token_invalid or enrollment_failed',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    403: FORBIDDEN_ORIGIN_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const SIGN_IN_FAILED_RESPONSE = {
  description: 'sign_in_failed: the passkey is unknown or the verification failed',
  content: { 'application/json': { schema: ErrorSchema } },
} as const

const signInOptionsRoute = createRoute({
  method: 'post',
  path: '/api/auth/sign-in/options',
  tags: ['auth'],
  summary: 'Start a sign-in with a discoverable passkey',
  security: [],
  responses: {
    200: {
      description: 'Options for navigator.credentials.get()',
      content: { 'application/json': { schema: CeremonyOptionsSchema } },
    },
    403: FORBIDDEN_ORIGIN_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const signInVerifyRoute = createRoute({
  method: 'post',
  path: '/api/auth/sign-in/verify',
  tags: ['auth'],
  summary: 'Finish the sign-in and open an access session',
  security: [],
  request: { body: signInBody },
  responses: {
    200: {
      description: 'The passkey was verified and the hd_session cookie was set',
      content: { 'application/json': { schema: SessionSchema } },
    },
    400: {
      description: 'invalid_request: the body is not a JSON object',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    401: SIGN_IN_FAILED_RESPONSE,
    403: FORBIDDEN_ORIGIN_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const getSessionRoute = createRoute({
  method: 'get',
  path: '/api/auth/session',
  tags: ['auth'],
  summary: 'Report whether the access session cookie is valid',
  responses: {
    200: {
      description: 'The access session is valid',
      content: { 'application/json': { schema: SessionSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const deleteSessionRoute = createRoute({
  method: 'delete',
  path: '/api/auth/session',
  tags: ['auth'],
  summary: 'Sign out: end the access session and clear its cookie',
  responses: {
    204: { description: 'The access session ended and the cookie was cleared' },
    401: UNAUTHENTICATED_RESPONSE,
    403: FORBIDDEN_ORIGIN_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

export function createAuthRoutes(deps: AuthRoutesDeps): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(enrollmentOptionsRoute, async (c) => {
    const { token } = c.req.valid('json')
    return c.json(await startEnrollment(deps, token), 200)
  })

  routes.openapi(enrollmentVerifyRoute, async (c) => {
    const { token, response } = c.req.valid('json')
    const session = await finishEnrollment(deps, token, response)
    setSessionCookie(c, session.token, deps.appOrigin)
    return c.json({ expiresAt: session.expiresAt }, 201)
  })

  routes.openapi(signInOptionsRoute, async (c) => c.json(await startSignIn(deps), 200))

  routes.openapi(signInVerifyRoute, async (c) => {
    const { response } = c.req.valid('json')
    const session = await finishSignIn(deps, response)
    setSessionCookie(c, session.token, deps.appOrigin)
    return c.json({ expiresAt: session.expiresAt }, 200)
  })

  routes.openapi(getSessionRoute, (c) => c.json({ expiresAt: c.var.authSession.expiresAt }, 200))

  routes.openapi(deleteSessionRoute, (c) => {
    endSession(deps.db, c.var.authSession.token)
    clearSessionCookie(c, deps.appOrigin)
    return c.body(null, 204)
  })

  return routes
}
