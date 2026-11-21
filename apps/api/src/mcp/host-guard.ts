import type { MiddlewareHandler } from 'hono'
import type { ErrorBody } from '../http/errors.js'

export const DEFAULT_MCP_ALLOWED_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '[::1]']

const FORBIDDEN_HOST_BODY: ErrorBody = { code: 'forbidden_host', message: 'host não permitido' }

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

// Blocks DNS rebinding: a browser page cannot reach /mcp through a hostname it controls.
export function mcpHostGuard(allowedHosts: readonly string[]): MiddlewareHandler {
  const allowed = new Set(allowedHosts)
  return async (c, next) => {
    const hostHeader = c.req.header('host')
    const host = hostnameOf(hostHeader ? `http://${hostHeader}` : c.req.url)
    const originHeader = c.req.header('origin')
    const originAllowed = originHeader === undefined || allowed.has(hostnameOf(originHeader) ?? '')

    if (host === undefined || !allowed.has(host) || !originAllowed) {
      return c.json<ErrorBody>(FORBIDDEN_HOST_BODY, 403)
    }
    await next()
  }
}
