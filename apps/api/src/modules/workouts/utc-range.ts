import { DomainError } from '../../errors/domain-error.js'
import { parseUtcInstant } from './utc-instant.js'

export const MAX_WORKOUT_RANGE_DAYS = 92
const DAY_MS = 24 * 60 * 60 * 1000

// The order follows decision 26: format, then the order of the bounds, then the length.
export function parseUtcRange(
  query: { from?: string | undefined; to?: string | undefined },
  maxDays: number,
): { from: string; to: string } {
  const from = parseUtcInstant(query.from)
  const to = parseUtcInstant(query.to)
  if (from === undefined || to === undefined) {
    throw new DomainError(
      'workout_range_required',
      'informe o início e o fim do intervalo em UTC',
      'invalid',
    )
  }
  if (to <= from) {
    throw new DomainError(
      'workout_range_inverted',
      'o fim do intervalo deve ser depois do início',
      'invalid',
    )
  }
  if (Date.parse(to) - Date.parse(from) > maxDays * DAY_MS) {
    throw new DomainError(
      'workout_range_too_long',
      `o intervalo deve ter no máximo ${maxDays} dias`,
      'invalid',
    )
  }
  return { from, to }
}
