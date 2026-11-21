import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { SESSION_IDLE_MS } from './session.service.js'

export const SESSION_COOKIE_NAME = 'hd_session'

// No Domain attribute, so the cookie stays on the app host; Secure follows the origin scheme.
function cookieOptions(appOrigin: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: new URL(appOrigin).protocol === 'https:',
  } as const
}

export function setSessionCookie(c: Context, token: string, appOrigin: string): void {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    ...cookieOptions(appOrigin),
    maxAge: SESSION_IDLE_MS / 1000,
  })
}

export function clearSessionCookie(c: Context, appOrigin: string): void {
  deleteCookie(c, SESSION_COOKIE_NAME, cookieOptions(appOrigin))
}

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME)
}
