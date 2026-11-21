import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { enrollmentFailed, enrollmentTokenInvalid } from './auth.errors.js'
import { generateToken, hashToken } from './auth-token.js'
import { type CeremonyDeps, verifiedOrFalse } from './ceremony.js'
import { insertCredential, listCredentialDescriptors } from './credential.repository.js'
import {
  consumeEnrollmentToken,
  deleteExpiredEnrollmentTokens,
  findUsableEnrollmentToken,
  insertEnrollmentToken,
} from './enrollment-token.repository.js'
import { type AuthSession, createSession } from './session.service.js'
import { readChallenge } from './webauthn.js'
import { getOrCreateWebAuthnUserId } from './webauthn-user.js'

export const ENROLLMENT_TOKEN_TTL_MS = 15 * 60 * 1000

export function createEnrollmentToken(
  db: Database,
  now: Date,
): { token: string; expiresAt: string } {
  const nowIso = now.toISOString()
  deleteExpiredEnrollmentTokens(db, nowIso)
  const token = generateToken()
  const expiresAt = new Date(now.getTime() + ENROLLMENT_TOKEN_TTL_MS).toISOString()
  insertEnrollmentToken(db, {
    id: createId(now.getTime()),
    tokenHash: hashToken(token),
    createdAt: nowIso,
    expiresAt,
    usedAt: null,
  })
  return { token, expiresAt }
}

export async function startEnrollment(
  deps: CeremonyDeps,
  token: string | undefined,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const now = deps.now()
  requireUsableToken(deps.db, token, now)
  return deps.webAuthn.createRegistrationOptions({
    challenge: deps.challenges.issue('enrollment'),
    userId: getOrCreateWebAuthnUserId(deps.db, now),
    excludeCredentials: listCredentialDescriptors(deps.db),
  })
}

export async function finishEnrollment(
  deps: CeremonyDeps,
  token: string | undefined,
  response: unknown,
): Promise<AuthSession & { token: string }> {
  const tokenHash = requireUsableToken(deps.db, token, deps.now())
  const challenge = readChallenge(response)
  if (challenge === undefined || !deps.challenges.consume(challenge, 'enrollment')) {
    throw enrollmentFailed()
  }
  const result = await verifiedOrFalse(() =>
    deps.webAuthn.verifyRegistration({ response, expectedChallenge: challenge }),
  )
  if (!result.verified) {
    throw enrollmentFailed()
  }
  const now = deps.now()
  const nowIso = now.toISOString()
  // Synchronous transaction: the token is spent only together with the stored credential.
  const stored = deps.db.$client.transaction(() => {
    if (!consumeEnrollmentToken(deps.db, tokenHash, nowIso)) {
      return false
    }
    insertCredential(deps.db, {
      id: createId(now.getTime()),
      credentialId: result.credential.credentialId,
      publicKey: Buffer.from(result.credential.publicKey),
      counter: result.credential.counter,
      transports:
        result.credential.transports === undefined
          ? null
          : JSON.stringify(result.credential.transports),
      createdAt: nowIso,
      lastUsedAt: null,
    })
    return true
  })()
  if (!stored) {
    throw enrollmentTokenInvalid()
  }
  return createSession(deps.db, now)
}

function requireUsableToken(db: Database, token: string | undefined, now: Date): string {
  const tokenHash = token ? hashToken(token) : undefined
  if (!tokenHash || !findUsableEnrollmentToken(db, tokenHash, now.toISOString())) {
    throw enrollmentTokenInvalid()
  }
  return tokenHash
}
