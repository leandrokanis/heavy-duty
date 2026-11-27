import type { CurrentPeriod, PeriodList } from './period.types'

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
const PERIODS_PATH = '/api/periods'
const INTENTION_PATH = '/api/periods/current/intention'

export type PeriodListResult =
  | { status: 'ok'; list: PeriodList }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

export async function fetchPeriods(): Promise<PeriodListResult> {
  try {
    const response = await fetch(PERIODS_PATH, { credentials: 'same-origin' })
    if (response.status === 200)
      return { status: 'ok', list: (await response.json()) as PeriodList }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}

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
