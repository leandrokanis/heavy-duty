import { z } from '@hono/zod-openapi'

export const ProtectedResourceMetadataSchema = z
  .object({
    resource: z.string().openapi({ example: 'https://hd.example/mcp' }),
    authorization_servers: z.array(z.string()).openapi({ example: ['https://hd.example'] }),
    bearer_methods_supported: z.array(z.literal('header')),
    resource_name: z.string(),
  })
  .openapi('OAuthProtectedResourceMetadata')

export const AuthorizationServerMetadataSchema = z
  .object({
    issuer: z.string().openapi({ example: 'https://hd.example' }),
    authorization_endpoint: z.string(),
    token_endpoint: z.string(),
    registration_endpoint: z.string(),
    response_types_supported: z.array(z.literal('code')),
    grant_types_supported: z.array(z.enum(['authorization_code', 'refresh_token'])),
    code_challenge_methods_supported: z.array(z.literal('S256')),
    token_endpoint_auth_methods_supported: z.array(z.literal('none')),
  })
  .openapi('OAuthAuthorizationServerMetadata')

export const OAuthErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'invalid_request' }),
    error_description: z.string(),
  })
  .openapi('OAuthError')

export const ClientRegistrationRequestSchema = z
  .object({
    client_name: z.string().max(100).optional(),
    redirect_uris: z.array(z.string()).optional(),
  })
  .openapi('OAuthClientRegistrationRequest')

export const ClientRegistrationSchema = z
  .object({
    client_id: z.string(),
    client_id_issued_at: z.number().int(),
    client_name: z.string().optional(),
    redirect_uris: z.array(z.string()),
    grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])),
    response_types: z.array(z.literal('code')),
    token_endpoint_auth_method: z.literal('none'),
  })
  .openapi('OAuthClientRegistration')

export const AuthorizationRequestSchema = z
  .object({
    response_type: z.string().optional(),
    client_id: z.string().optional(),
    redirect_uri: z.string().optional(),
    code_challenge: z.string().optional(),
    code_challenge_method: z.string().optional(),
    state: z.string().optional(),
    resource: z.string().optional(),
    scope: z.string().optional(),
  })
  .openapi('OAuthAuthorizationRequest')

export const AuthorizationPreviewSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('consent'),
      clientName: z.string().nullable(),
      redirectHost: z.string().openapi({ example: 'claude.ai' }),
    }),
    z.object({
      kind: z.literal('error_redirect'),
      redirectTo: z.string(),
    }),
  ])
  .openapi('OAuthAuthorizationPreview')

export const AuthorizationDecisionSchema = AuthorizationRequestSchema.extend({
  decision: z.enum(['approve', 'deny']),
}).openapi('OAuthAuthorizationDecision')

export const AuthorizationRedirectSchema = z
  .object({ redirectTo: z.string() })
  .openapi('OAuthAuthorizationRedirect')

export const TokenRequestSchema = z
  .object({
    grant_type: z.string().optional(),
    code: z.string().optional(),
    redirect_uri: z.string().optional(),
    client_id: z.string().optional(),
    code_verifier: z.string().optional(),
    refresh_token: z.string().optional(),
    resource: z.string().optional(),
    scope: z.string().optional(),
  })
  .openapi('OAuthTokenRequest')

export const TokenResponseSchema = z
  .object({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number().int().openapi({ example: 3600 }),
    refresh_token: z.string(),
  })
  .openapi('OAuthTokenResponse')
