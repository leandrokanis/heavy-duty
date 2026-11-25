import { describe, expect, it } from 'vitest'
import { addLocalDays, clockOf, dayWordOf, instantAtLocal, localTimeOf } from './notice-time.js'

const SAO_PAULO = 'America/Sao_Paulo'
const NEW_YORK = 'America/New_York'

describe('Given an instant in UTC and the zone of São Paulo (UTC-3)', () => {
  describe('When its local time is read', () => {
    it('Then should give the wall clock date, hour and minute', () => {
      expect(localTimeOf(Date.parse('2026-11-25T02:30:00.000Z'), SAO_PAULO)).toEqual({
        date: '2026-11-24',
        hour: 23,
        minute: 30,
      })
    })
  })

  describe('When the instant of 21h of a local date is asked', () => {
    it('Then should give that hour in UTC', () => {
      expect(new Date(instantAtLocal('2026-11-24', 21, SAO_PAULO)).toISOString()).toBe(
        '2026-11-25T00:00:00.000Z',
      )
    })
  })
})

describe('Given a zone with daylight saving', () => {
  describe('When the instant of 21h is asked on each side of the change', () => {
    it('Then should follow the offset of each date', () => {
      expect([
        new Date(instantAtLocal('2026-03-07', 21, NEW_YORK)).toISOString(),
        new Date(instantAtLocal('2026-03-09', 21, NEW_YORK)).toISOString(),
      ]).toEqual(['2026-03-08T02:00:00.000Z', '2026-03-10T01:00:00.000Z'])
    })
  })
})

describe('Given a local date at the end of a month', () => {
  describe('When a day is added', () => {
    it('Then should give the first day of the next month', () => {
      expect(addLocalDays('2026-11-30', 1)).toBe('2026-12-01')
    })
  })
})

// 2026-11-25 is a Wednesday.
describe('Given now at 10h of a Wednesday in São Paulo', () => {
  const nowMs = Date.parse('2026-11-25T13:00:00.000Z')

  describe.each([
    ['later today', '2026-11-25T23:00:00.000Z', 'hoje'],
    ['tomorrow, after midnight in UTC', '2026-11-27T02:00:00.000Z', 'amanhã'],
    ['two days later', '2026-11-27T12:00:00.000Z', 'sexta'],
  ])('When the event is %s', (_case, eventAt, word) => {
    it(`Then the day should read "${word}"`, () => {
      expect(dayWordOf(Date.parse(eventAt), nowMs, SAO_PAULO)).toBe(word)
    })
  })
})

describe('Given instants in São Paulo', () => {
  describe('When the time is written', () => {
    it('Then should drop zero minutes and keep the others', () => {
      expect([
        clockOf(Date.parse('2026-11-26T12:00:00.000Z'), SAO_PAULO),
        clockOf(Date.parse('2026-11-26T12:30:00.000Z'), SAO_PAULO),
        clockOf(Date.parse('2026-11-26T23:05:00.000Z'), SAO_PAULO),
      ]).toEqual(['9h', '9h30', '20h05'])
    })
  })
})
