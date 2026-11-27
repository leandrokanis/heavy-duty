import type { CurrentPeriod } from './period.types'

export type PeriodResult =
  | { status: 'ok'; period: CurrentPeriod }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

export type IntentionResult =
  | { status: 'ok'; period: CurrentPeriod }
  | { status: 'unauthenticated' }
  | { status: 'offline' }
  | { status: 'rejected'; message: string }

const CURRENT_PERIOD_PATH = '/api/periods/current'
const INTENTION_PATH = '/api/periods/current/intention'

export async function fetchCurrentPeriod(): Promise<PeriodResult> {
  try {
    const response = await fetch(CURRENT_PERIOD_PATH, { credentials: 'same-origin' })
    if (response.status === 200) {
      return { status: 'ok', period: (await response.json()) as CurrentPeriod }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}

// Written straight to the API, only with signal: the intention is not a step of the workout and
// does not go through the queue (D98).
export async function saveIntention(intention: string): Promise<IntentionResult> {
  try {
    const response = await fetch(INTENTION_PATH, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intention }),
    })
    if (response.status === 200) {
      return { status: 'ok', period: (await response.json()) as CurrentPeriod }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    if (response.status === 400) {
      const body = (await response.json()) as { message?: string }
      return { status: 'rejected', message: body.message ?? 'A frase não foi salva.' }
    }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}
