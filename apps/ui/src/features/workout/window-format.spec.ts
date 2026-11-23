import { describe, expect, it } from 'vitest'
import { formatCoolingFor, formatWindowWhen } from './window-format'

const SAO_PAULO = 'America/Sao_Paulo'
// Monday 2026-11-23, 09:00 in Sao Paulo (UTC-3).
const NOW_MS = Date.parse('2026-11-23T12:00:00.000Z')

function when(atIso: string) {
  return formatWindowWhen(Date.parse(atIso), NOW_MS, SAO_PAULO)
}

describe('Given it is Monday 09:00 at the device', () => {
  describe('When a time later today is formatted', () => {
    it('Then should read "hoje" with the hour', () => {
      expect(when('2026-11-24T00:00:00.000Z')).toBe('hoje 21h')
    })
  })

  describe('When a time at 23:30 of the device day is formatted', () => {
    it('Then should follow the device day, not the UTC day, and keep the minutes', () => {
      expect(when('2026-11-24T02:30:00.000Z')).toBe('hoje 23h30')
    })
  })

  describe('When a time on the next day is formatted', () => {
    it('Then should read "amanhã" with the hour', () => {
      expect(when('2026-11-24T12:00:00.000Z')).toBe('amanhã 9h')
    })
  })

  describe('When a time two to six days ahead is formatted', () => {
    it.each([
      ['2026-11-25T12:00:00.000Z', 'qua 9h'],
      ['2026-11-26T23:00:00.000Z', 'qui 20h'],
      ['2026-11-28T12:00:00.000Z', 'sáb 9h'],
      ['2026-11-29T12:00:00.000Z', 'dom 9h'],
    ])('Then %s should read %s', (atIso, expected) => {
      expect(when(atIso)).toBe(expected)
    })
  })

  describe('When a time seven days ahead or more is formatted', () => {
    it.each([
      ['2026-11-30T12:00:00.000Z', '30/11 9h'],
      ['2027-01-05T12:30:00.000Z', '05/01 9h30'],
    ])('Then %s should read %s', (atIso, expected) => {
      expect(when(atIso)).toBe(expected)
    })
  })
})

describe('Given a window that closed some time ago', () => {
  describe('When the time since the closing is formatted', () => {
    it.each([
      [30 * 60_000, 'há menos de 1 h'],
      [60 * 60_000, 'há 1 h'],
      [23 * 3_600_000 + 59 * 60_000, 'há 23 h'],
      [24 * 3_600_000, 'há 1 dia'],
      [47 * 3_600_000, 'há 1 dia'],
      [48 * 3_600_000, 'há 2 dias'],
    ])('Then %i ms should read %s', (elapsedMs, expected) => {
      expect(formatCoolingFor(NOW_MS - elapsedMs, NOW_MS)).toBe(expected)
    })
  })
})
