import type { Database } from '../../db/connection.js'
import type { ChallengeStore } from './challenge-store.js'
import type { WebAuthnVerifier } from './webauthn.js'

export type CeremonyDeps = {
  db: Database
  now: () => Date
  challenges: ChallengeStore
  webAuthn: WebAuthnVerifier
}

// The library error message carries the challenge, so it is dropped instead of logged (FR-028).
export async function verifiedOrFalse<T extends { verified: boolean }>(
  verification: () => Promise<T>,
): Promise<T | { verified: false }> {
  try {
    return await verification()
  } catch {
    return { verified: false }
  }
}
