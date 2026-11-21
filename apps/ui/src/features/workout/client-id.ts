import { v7 } from 'uuid'

// UUID v7 (ADR-014): the id of a set or workout is its idempotency key on the API.
export function createClientId(nowMs: number = Date.now()): string {
  return v7({ msecs: nowMs })
}
