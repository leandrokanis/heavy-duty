import { DEFAULT_APP_ORIGIN } from '../app.js'
import type { Database } from '../db/connection.js'
import { createId } from '../db/id.js'
import { issueGrant } from '../modules/auth/oauth.service.js'
import { insertClient } from '../modules/auth/oauth-client.repository.js'
import { mcpResourceOf } from '../modules/auth/oauth-endpoints.js'

type RequestingApp = {
  request: (input: string, init?: RequestInit) => Response | Promise<Response>
}

export type McpAccessTokenOptions = {
  appOrigin?: string
  resource?: string
  now?: Date
}

// Issues a credential through the service for an approved client, as the token route would.
export function createMcpAccessToken(db: Database, options: McpAccessTokenOptions = {}): string {
  const now = options.now ?? new Date()
  const clientId = createId(now.getTime())
  insertClient(db, {
    id: clientId,
    clientName: 'heavy-duty-spec',
    redirectUris: JSON.stringify(['http://127.0.0.1:3199/callback']),
    createdAt: now.toISOString(),
    approvedAt: now.toISOString(),
  })
  const resource = options.resource ?? mcpResourceOf(options.appOrigin ?? DEFAULT_APP_ORIGIN)
  return issueGrant(db, { clientId, resource }, now).accessToken
}

export function withMcpAccessToken<T extends RequestingApp>(app: T, token: string): T {
  const view = Object.create(app) as T
  view.request = (input, init) => {
    const headers = new Headers(init?.headers)
    headers.set('authorization', `Bearer ${token}`)
    return app.request(input, { ...init, headers })
  }
  return view
}

// Returns a view of the app whose request() sends a valid MCP credential, for specs that are not about auth.
export function createMcpAuthorizedApp<T extends RequestingApp>(
  app: T,
  db: Database,
  options: McpAccessTokenOptions = {},
): T {
  return withMcpAccessToken(app, createMcpAccessToken(db, options))
}
