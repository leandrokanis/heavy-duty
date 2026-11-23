import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import { clearCachedToday } from '@/sync/today-cache'
import { clearCachedWindows } from '@/sync/windows-cache'

export type SessionState = 'authenticated' | 'unauthenticated' | 'offline'

export type EnrollmentFailure = 'enrollment_token_invalid' | 'enrollment_failed'

export type EnrollmentResult<T> = { ok: true; value: T } | { ok: false; code: EnrollmentFailure }

const SESSION_PATH = '/api/auth/session'

// Same origin as the API, so the hd_session cookie travels without CORS, see ADR-019.
const SAME_ORIGIN = { credentials: 'same-origin' } as const

function postJson(path: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    ...SAME_ORIGIN,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function fetchSession(): Promise<SessionState> {
  try {
    const response = await fetch(SESSION_PATH, SAME_ORIGIN)
    if (response.status === 200) return 'authenticated'
    if (response.status === 401) return 'unauthenticated'
    return 'offline'
  } catch {
    return 'offline'
  }
}

export async function requestSignInOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const response = await postJson('/api/auth/sign-in/options')
  if (!response.ok) throw new Error(`sign-in options failed with ${response.status}`)
  return (await response.json()) as PublicKeyCredentialRequestOptionsJSON
}

export async function verifySignIn(response: AuthenticationResponseJSON): Promise<boolean> {
  return (await postJson('/api/auth/sign-in/verify', { response })).ok
}

export async function requestEnrollmentOptions(
  token: string,
): Promise<EnrollmentResult<PublicKeyCredentialCreationOptionsJSON>> {
  const response = await postJson('/api/auth/enrollment/options', { token })
  if (!response.ok) return { ok: false, code: await readEnrollmentFailure(response) }
  return { ok: true, value: (await response.json()) as PublicKeyCredentialCreationOptionsJSON }
}

export async function verifyEnrollment(
  token: string,
  response: RegistrationResponseJSON,
): Promise<EnrollmentResult<null>> {
  const result = await postJson('/api/auth/enrollment/verify', { token, response })
  if (!result.ok) return { ok: false, code: await readEnrollmentFailure(result) }
  return { ok: true, value: null }
}

// The precache holds only static files and the offline page, so it survives the sign-out.
// The copy of the workout of the day goes too. The queue and the workout in progress stay: they hold
// the sets that still have to reach the API (ADR-021).
export async function signOut(): Promise<void> {
  await fetch(SESSION_PATH, { method: 'DELETE', ...SAME_ORIGIN })
  await clearCachedToday()
  await clearCachedWindows()
  if (typeof caches === 'undefined') return
  const names = await caches.keys()
  await Promise.all(
    names.filter((name) => !name.includes('precache')).map((name) => caches.delete(name)),
  )
}

async function readEnrollmentFailure(response: Response): Promise<EnrollmentFailure> {
  try {
    const body = (await response.json()) as { code?: unknown }
    return body.code === 'enrollment_token_invalid'
      ? 'enrollment_token_invalid'
      : 'enrollment_failed'
  } catch {
    return 'enrollment_failed'
  }
}
