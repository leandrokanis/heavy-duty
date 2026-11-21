import type { Database } from '../db/connection.js'
import { createSession } from '../modules/auth/session.service.js'
import { SESSION_COOKIE_NAME } from '../modules/auth/session-cookie.js'

type RequestingApp = {
  request: (input: string, init?: RequestInit) => Response | Promise<Response>
}

export function createSessionCookie(db: Database, now: Date = new Date()): string {
  return `${SESSION_COOKIE_NAME}=${createSession(db, now).token}`
}

// Returns a view of the app whose request() sends the cookie, for specs that are not about auth.
export function withSessionCookie<T extends RequestingApp>(app: T, cookie: string): T {
  const view = Object.create(app) as T
  view.request = (input, init) => {
    const headers = new Headers(init?.headers)
    headers.set('cookie', cookie)
    return app.request(input, { ...init, headers })
  }
  return view
}

export function createSignedInApp<T extends RequestingApp>(app: T, db: Database): T {
  return withSessionCookie(app, createSessionCookie(db))
}
