import { describe, expect, it } from 'vitest'
import { formatPeriodDays, weekOfPeriod } from './period-format'

const STARTS_AT = '2026-11-23T03:00:00.000Z'

describe('Given period 1 from Monday 2026-11-23 in São Paulo', () => {
  describe.each([
    ['its start', '2026-11-23T03:00:00.000Z', 1],
    ['the second Monday', '2026-11-30T03:00:00.000Z', 2],
    ['an instant after its end', '2027-03-01T00:00:00.000Z', 12],
  ])('When the week of %s is asked', (_label, instant, week) => {
    it(`Then should be week ${week}`, () => {
      expect(weekOfPeriod(STARTS_AT, 12, Date.parse(instant))).toBe(week)
    })
  })

  describe('When its days are formatted', () => {
    it('Then should show the first and the last day', () => {
      expect(formatPeriodDays(STARTS_AT, '2027-02-15T03:00:00.000Z', 'America/Sao_Paulo')).toBe(
        'De 23 de nov. a 14 de fev.',
      )
    })
  })
})
