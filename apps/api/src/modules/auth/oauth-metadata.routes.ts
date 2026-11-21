import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { createRouter, ErrorSchema } from '../../http/errors.js'
import {
  AuthorizationServerMetadataSchema,
  ProtectedResourceMetadataSchema,
} from './oauth.schemas.js'
import {
  AUTHORIZATION_SCREEN_PATH,
  AUTHORIZATION_SERVER_METADATA_PATH,
  MCP_RESOURCE_PATH,
  mcpResourceOf,
  PROTECTED_RESOURCE_METADATA_PATH,
  REGISTER_PATH,
  TOKEN_PATH,
} from './oauth-endpoints.js'

const INTERNAL_ERROR_RESPONSE = {
  description: 'Unexpected error',
  content: { 'application/json': { schema: ErrorSchema } },
} as const

const protectedResourceResponses = {
  200: {
    description: 'Protected resource metadata of /mcp (RFC 9728)',
    content: { 'application/json': { schema: ProtectedResourceMetadataSchema } },
  },
  500: INTERNAL_ERROR_RESPONSE,
} as const

const mcpResourceMetadataRoute = createRoute({
  method: 'get',
  path: `${PROTECTED_RESOURCE_METADATA_PATH}${MCP_RESOURCE_PATH}`,
  tags: ['oauth'],
  summary: 'Describe /mcp as an OAuth protected resource',
  security: [],
  responses: protectedResourceResponses,
})

const rootResourceMetadataRoute = createRoute({
  method: 'get',
  path: PROTECTED_RESOURCE_METADATA_PATH,
  tags: ['oauth'],
  summary: 'Describe /mcp as an OAuth protected resource, for clients that try the root first',
  security: [],
  responses: protectedResourceResponses,
})

const authorizationServerMetadataRoute = createRoute({
  method: 'get',
  path: AUTHORIZATION_SERVER_METADATA_PATH,
  tags: ['oauth'],
  summary: 'Describe the authorization server of the app (RFC 8414)',
  security: [],
  responses: {
    200: {
      description: 'Authorization server metadata',
      content: { 'application/json': { schema: AuthorizationServerMetadataSchema } },
    },
    500: INTERNAL_ERROR_RESPONSE,
  },
})

export function createOAuthMetadataRoutes(appOrigin: string): OpenAPIHono {
  const routes = createRouter()
  const resourceMetadata = {
    resource: mcpResourceOf(appOrigin),
    authorization_servers: [appOrigin],
    bearer_methods_supported: ['header' as const],
    resource_name: 'Heavy Duty MCP',
  }
  const serverMetadata = {
    issuer: appOrigin,
    authorization_endpoint: `${appOrigin}${AUTHORIZATION_SCREEN_PATH}`,
    token_endpoint: `${appOrigin}${TOKEN_PATH}`,
    registration_endpoint: `${appOrigin}${REGISTER_PATH}`,
    response_types_supported: ['code' as const],
    grant_types_supported: ['authorization_code' as const, 'refresh_token' as const],
    code_challenge_methods_supported: ['S256' as const],
    token_endpoint_auth_methods_supported: ['none' as const],
  }

  routes.openapi(mcpResourceMetadataRoute, (c) => c.json(resourceMetadata, 200))
  routes.openapi(rootResourceMetadataRoute, (c) => c.json(resourceMetadata, 200))
  routes.openapi(authorizationServerMetadataRoute, (c) => c.json(serverMetadata, 200))

  return routes
}
