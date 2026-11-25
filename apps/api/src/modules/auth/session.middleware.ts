import type { MiddlewareHandler } from 'hono'
import type { Database } from '../../db/connection.js'
import { UNAUTHENTICATED_BODY } from '../../http/errors.js'
import { type AuthSession, validateSession } from './session.service.js'
import { readSessionCookie, setSessionCookie } from './session-cookie.js'

declare module 'hono' {
  interface ContextVariableMap {
    authSession: AuthSession & { token: string }
  }
}

// Closed list: a new /api route is protected unless it is added here. The link to turn the
// emails off works without signing in (ADR-037, addendum to ADR-019).
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  'GET /api/health',
  'POST /api/auth/enrollment/options',
  'POST /api/auth/enrollment/verify',
  'POST /api/auth/sign-in/options',
  'POST /api/auth/sign-in/verify',
  'POST /api/oauth/register',
  'POST /api/oauth/token',
  'POST /api/email/unsubscribe',
])

export type SessionGuardOptions = {
  db: Database
  now: () => Date
  appOrigin: string
}

export function requireSession(options: SessionGuardOptions): MiddlewareHandler {
  return async (c, next) => {
    if (PUBLIC_ROUTES.has(`${c.req.method} ${c.req.path}`)) {
      return next()
    }
    const token = readSessionCookie(c)
    const session = token ? validateSession(options.db, token, options.now()) : undefined
    if (!token || !session) {
      return c.json(UNAUTHENTICATED_BODY, 401)
    }
    if (session.renewed) {
      setSessionCookie(c, token, options.appOrigin)
    }
    c.set('authSession', { id: session.id, expiresAt: session.expiresAt, token })
    return next()
  }
}
