import type { MiddlewareHandler } from 'hono'
import type { ErrorBody } from './errors.js'

const STATE_CHANGING_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const FORBIDDEN_ORIGIN_BODY: ErrorBody = {
  code: 'forbidden_origin',
  message: 'origem não permitida',
}

// Browsers always send Origin on cross-site writes; clients outside a browser carry no victim cookie.
export function originGuard(appOrigin: string): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin')
    if (STATE_CHANGING_METHODS.has(c.req.method) && origin !== undefined && origin !== appOrigin) {
      return c.json(FORBIDDEN_ORIGIN_BODY, 403)
    }
    return next()
  }
}
