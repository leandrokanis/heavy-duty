export type AuthorizationDecision = 'approve' | 'deny'

export type AuthorizationPreview =
  | { kind: 'consent'; clientName: string | null; redirectHost: string }
  | { kind: 'error_redirect'; redirectTo: string }
  | { kind: 'refused'; message: string }
  | { kind: 'offline' }

export type DecisionResult =
  | { kind: 'redirect'; redirectTo: string }
  | { kind: 'refused'; message: string }
  | { kind: 'offline' }

const AUTHORIZATION_PATH = '/api/oauth/authorization'

// Same origin as the API, so the hd_session cookie travels without CORS, see ADR-020.
const SAME_ORIGIN = { credentials: 'same-origin' } as const

const FALLBACK_MESSAGE = 'Não foi possível concluir a autorização. Tente de novo.'

async function readMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown }
    return typeof body.message === 'string' ? body.message : FALLBACK_MESSAGE
  } catch {
    return FALLBACK_MESSAGE
  }
}

export async function fetchAuthorizationPreview(query: string): Promise<AuthorizationPreview> {
  let response: Response
  try {
    response = await fetch(`${AUTHORIZATION_PATH}?${query}`, SAME_ORIGIN)
  } catch {
    return { kind: 'offline' }
  }
  if (!response.ok) return { kind: 'refused', message: await readMessage(response) }
  return (await response.json()) as AuthorizationPreview
}

export async function sendAuthorizationDecision(
  query: string,
  decision: AuthorizationDecision,
): Promise<DecisionResult> {
  let response: Response
  try {
    response = await fetch(AUTHORIZATION_PATH, {
      method: 'POST',
      ...SAME_ORIGIN,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(new URLSearchParams(query)), decision }),
    })
  } catch {
    return { kind: 'offline' }
  }
  if (!response.ok) return { kind: 'refused', message: await readMessage(response) }
  const { redirectTo } = (await response.json()) as { redirectTo: string }
  return { kind: 'redirect', redirectTo }
}
