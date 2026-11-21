import type { MiddlewareHandler } from 'hono'
import type { Database } from '../db/connection.js'
import type { ErrorBody } from '../http/errors.js'
import { validateAccessToken } from '../modules/auth/oauth.service.js'
import { mcpResourceOf, resourceMetadataUrlOf } from '../modules/auth/oauth-endpoints.js'

export const MCP_UNAUTHENTICATED_BODY: ErrorBody = {
  code: 'mcp_unauthenticated',
  message: 'credencial do MCP ausente ou inválida',
}

export type BearerGuardOptions = {
  db: Database
  now: () => Date
  appOrigin: string
}

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i

function readBearerToken(header: string | undefined): string | undefined {
  return header === undefined ? undefined : BEARER_PATTERN.exec(header)?.[1]
}

// Reads only the Authorization header: a token in the query string or a session cookie counts as missing.
export function mcpBearerGuard(options: BearerGuardOptions): MiddlewareHandler {
  const resource = mcpResourceOf(options.appOrigin)
  const challenge = `Bearer resource_metadata="${resourceMetadataUrlOf(options.appOrigin)}"`
  return async (c, next) => {
    const token = readBearerToken(c.req.header('authorization'))
    if (token && validateAccessToken(options.db, token, { resource, now: options.now() })) {
      return next()
    }
    c.header('WWW-Authenticate', token ? `${challenge}, error="invalid_token"` : challenge)
    return c.json<ErrorBody>(MCP_UNAUTHENTICATED_BODY, 401)
  }
}
