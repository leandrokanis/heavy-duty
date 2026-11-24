import { SEND_TIMEOUT_MS } from './workout.config'
import type { SendOutcome } from './workout-set.types'

export type PostWithOutcome = {
  method?: 'POST' | 'PATCH' | 'DELETE'
  path: string
  // Undefined sends no body and no content type.
  body?: unknown
  // The statuses that mean the item is done; 200 and 201 when not given.
  confirmedStatuses?: ReadonlySet<number>
  // The statuses that mean a domain refusal; every other failure is retried.
  rejectedStatuses: ReadonlySet<number>
  defaultRejectionMessage: string
}

const DEFAULT_CONFIRMED_STATUSES: ReadonlySet<number> = new Set([200, 201])

// A timer of the page, not AbortSignal.timeout, so the tests drive it with fake timers.
export async function postWithOutcome({
  method = 'POST',
  path,
  body,
  confirmedStatuses = DEFAULT_CONFIRMED_STATUSES,
  rejectedStatuses,
  defaultRejectionMessage,
}: PostWithOutcome): Promise<SendOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const payload =
      body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    const response = await fetch(path, {
      method,
      ...payload,
      credentials: 'same-origin',
      signal: controller.signal,
    })
    if (confirmedStatuses.has(response.status)) return { status: 'confirmed' }
    if (rejectedStatuses.has(response.status))
      return await rejectionOf(response, defaultRejectionMessage)
    return { status: 'retry' }
  } catch {
    return { status: 'retry' }
  } finally {
    clearTimeout(timer)
  }
}

async function rejectionOf(response: Response, defaultMessage: string): Promise<SendOutcome> {
  try {
    const body = (await response.json()) as { code?: unknown; message?: unknown }
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return { status: 'rejected', code: body.code, message: body.message }
    }
  } catch {
    // A body that is not JSON falls through to the default refusal.
  }
  return { status: 'rejected', code: 'unknown', message: defaultMessage }
}
