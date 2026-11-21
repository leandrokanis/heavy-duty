import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import { handleOAuthError, oauthErrorResponse, requestBodyTooLarge } from './oauth.errors.js'
import {
  AuthorizationDecisionSchema,
  AuthorizationPreviewSchema,
  AuthorizationRedirectSchema,
  AuthorizationRequestSchema,
  ClientRegistrationRequestSchema,
  ClientRegistrationSchema,
  OAuthErrorSchema,
  TokenRequestSchema,
  TokenResponseSchema,
} from './oauth.schemas.js'
import {
  checkAuthorizationRequest,
  decideAuthorization,
  exchangeToken,
  registerClient,
} from './oauth.service.js'
import { AUTHORIZATION_PATH, REGISTER_PATH, TOKEN_PATH } from './oauth-endpoints.js'

export type OAuthRoutesDeps = {
  db: Database
  now: () => Date
  appOrigin: string
}

const MAX_PUBLIC_BODY_BYTES = 16 * 1024

const INTERNAL_ERROR_RESPONSE = {
  description: 'Unexpected error',
  content: { 'application/json': { schema: ErrorSchema } },
} as const

const oauthError = (description: string) =>
  ({ description, content: { 'application/json': { schema: OAuthErrorSchema } } }) as const

const registerRoute = createRoute({
  method: 'post',
  path: REGISTER_PATH,
  tags: ['oauth'],
  summary: 'Register a public OAuth client of the MCP (RFC 7591)',
  security: [],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: ClientRegistrationRequestSchema } },
    },
  },
  responses: {
    201: {
      description: 'The client was registered; it reaches nothing until the PO approves it',
      content: { 'application/json': { schema: ClientRegistrationSchema } },
    },
    400: oauthError('invalid_redirect_uri or invalid_client_metadata'),
    413: oauthError('invalid_request: the body is larger than 16 KiB'),
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const previewRoute = createRoute({
  method: 'get',
  path: AUTHORIZATION_PATH,
  tags: ['oauth'],
  summary: 'Check an authorization request and describe it for the consent screen',
  request: { query: AuthorizationRequestSchema },
  responses: {
    200: {
      description:
        'consent with the declared client name and the redirect host, or error_redirect with the address that carries the OAuth error',
      content: { 'application/json': { schema: AuthorizationPreviewSchema } },
    },
    400: {
      description: 'oauth_client_unknown or oauth_redirect_uri_invalid: nothing may redirect',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const decisionRoute = createRoute({
  method: 'post',
  path: AUTHORIZATION_PATH,
  tags: ['oauth'],
  summary: 'Approve or deny an authorization request of an MCP client',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AuthorizationDecisionSchema } },
    },
  },
  responses: {
    200: {
      description:
        'Address of the redirect_uri with code and state on approval, or with error=access_denied on denial',
      content: { 'application/json': { schema: AuthorizationRedirectSchema } },
    },
    400: {
      description:
        'invalid_request, oauth_client_unknown or oauth_redirect_uri_invalid: nothing may redirect',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    403: {
      description: 'The Origin header belongs to another site',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    500: INTERNAL_ERROR_RESPONSE,
  },
})

const tokenRoute = createRoute({
  method: 'post',
  path: TOKEN_PATH,
  tags: ['oauth'],
  summary: 'Exchange an authorization code or a refresh token for an MCP credential',
  security: [],
  request: {
    body: {
      required: true,
      content: { 'application/x-www-form-urlencoded': { schema: TokenRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'A credential of 1 hour and a new refresh token; Cache-Control: no-store',
      content: { 'application/json': { schema: TokenResponseSchema } },
    },
    400: oauthError('invalid_request, invalid_grant, invalid_target or unsupported_grant_type'),
    401: oauthError('invalid_client: the client_id is unknown'),
    413: oauthError('invalid_request: the body is larger than 16 KiB'),
    500: INTERNAL_ERROR_RESPONSE,
  },
})

function limitPublicBody() {
  return bodyLimit({
    maxSize: MAX_PUBLIC_BODY_BYTES,
    onError: (c) => oauthErrorResponse(c, requestBodyTooLarge()),
  })
}

export function createOAuthRoutes(deps: OAuthRoutesDeps): OpenAPIHono {
  const routes = createRouter()

  routes.use(REGISTER_PATH, limitPublicBody())
  routes.use(TOKEN_PATH, limitPublicBody())

  routes.openapi(
    registerRoute,
    (c) => {
      const body = c.req.valid('json')
      const now = deps.now()
      const client = registerClient(
        deps.db,
        { clientName: body.client_name, redirectUris: body.redirect_uris },
        now,
      )
      return c.json(
        {
          client_id: client.id,
          client_id_issued_at: Math.floor(now.getTime() / 1000),
          ...(client.clientName === null ? {} : { client_name: client.clientName }),
          redirect_uris: client.redirectUris,
          grant_types: ['authorization_code' as const, 'refresh_token' as const],
          response_types: ['code' as const],
          token_endpoint_auth_method: 'none' as const,
        },
        201,
      )
    },
    (result, c) => {
      if (!result.success) {
        return c.json(
          { error: 'invalid_client_metadata', error_description: 'client metadata is not valid' },
          400,
        )
      }
    },
  )

  routes.openapi(previewRoute, (c) => {
    const checked = checkAuthorizationRequest(deps.db, c.req.valid('query'), deps.appOrigin)
    if (checked.kind === 'error_redirect') {
      return c.json(checked, 200)
    }
    return c.json(
      {
        kind: 'consent' as const,
        clientName: checked.clientName,
        redirectHost: new URL(checked.redirectUri).host,
      },
      200,
    )
  })

  routes.openapi(decisionRoute, (c) =>
    c.json(decideAuthorization(deps.db, c.req.valid('json'), deps.appOrigin, deps.now()), 200),
  )

  routes.openapi(
    tokenRoute,
    (c) => {
      const tokens = exchangeToken(deps.db, c.req.valid('form'), deps.now())
      c.header('Cache-Control', 'no-store')
      c.header('Pragma', 'no-cache')
      return c.json(
        {
          access_token: tokens.accessToken,
          token_type: 'Bearer' as const,
          expires_in: tokens.expiresInSeconds,
          refresh_token: tokens.refreshToken,
        },
        200,
      )
    },
    (result, c) => {
      if (!result.success) {
        return c.json(
          { error: 'invalid_request', error_description: 'token request is not valid' },
          400,
        )
      }
    },
  )

  routes.onError(handleOAuthError)

  return routes
}
