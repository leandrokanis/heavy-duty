import { v7 } from 'uuid'

export function createId(nowMs: number = Date.now()): string {
  return v7({ msecs: nowMs })
}
