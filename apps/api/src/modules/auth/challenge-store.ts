import { randomBytes } from 'node:crypto'

export type ChallengeKind = 'enrollment' | 'sign-in'

export type ChallengeStore = {
  issue: (kind: ChallengeKind) => string
  consume: (challenge: string, kind: ChallengeKind) => boolean
}

export type ChallengeStoreOptions = {
  now: () => Date
  ttlMs: number
  capacity: number
}

type StoredChallenge = { kind: ChallengeKind; expiresAtMs: number }

const CHALLENGE_BYTES = 32

// Kept in process memory: the API runs as one process and a challenge lives 5 minutes, see ADR-019.
export function createChallengeStore(options: ChallengeStoreOptions): ChallengeStore {
  // A Map iterates in insertion order, so the first key is the oldest challenge.
  const challenges = new Map<string, StoredChallenge>()

  return {
    issue(kind) {
      const challenge = randomBytes(CHALLENGE_BYTES).toString('base64url')
      while (challenges.size >= options.capacity) {
        const oldest = challenges.keys().next().value
        if (oldest === undefined) break
        challenges.delete(oldest)
      }
      challenges.set(challenge, { kind, expiresAtMs: options.now().getTime() + options.ttlMs })
      return challenge
    },
    consume(challenge, kind) {
      const stored = challenges.get(challenge)
      challenges.delete(challenge)
      return (
        stored !== undefined &&
        stored.kind === kind &&
        options.now().getTime() <= stored.expiresAtMs
      )
    },
  }
}
