import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server'
import { signInFailed } from './auth.errors.js'
import { type CeremonyDeps, verifiedOrFalse } from './ceremony.js'
import {
  findCredentialByCredentialId,
  toStoredCredential,
  updateCredentialUse,
} from './credential.repository.js'
import { type AuthSession, createSession } from './session.service.js'
import { readChallenge, readCredentialId } from './webauthn.js'

export function startSignIn(deps: CeremonyDeps): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return deps.webAuthn.createAuthenticationOptions({ challenge: deps.challenges.issue('sign-in') })
}

export async function finishSignIn(
  deps: CeremonyDeps,
  response: unknown,
): Promise<AuthSession & { token: string }> {
  const challenge = readChallenge(response)
  if (challenge === undefined || !deps.challenges.consume(challenge, 'sign-in')) {
    throw signInFailed()
  }
  const credentialId = readCredentialId(response)
  const row = credentialId ? findCredentialByCredentialId(deps.db, credentialId) : undefined
  if (!row) {
    throw signInFailed()
  }
  const result = await verifiedOrFalse(() =>
    deps.webAuthn.verifyAuthentication({
      response,
      expectedChallenge: challenge,
      credential: toStoredCredential(row),
    }),
  )
  if (!result.verified) {
    throw signInFailed()
  }
  const now = deps.now()
  updateCredentialUse(deps.db, row.id, {
    counter: result.newCounter,
    lastUsedAt: now.toISOString(),
  })
  return createSession(deps.db, now)
}
