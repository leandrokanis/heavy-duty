import { describe, expect, it } from 'vitest'
import { firstPeriodStartOf, periodAt, weekOfPeriod } from './period.rules.js'

const SAO_PAULO = 'America/Sao_Paulo'
const NEW_YORK = 'America/New_York'
const iso = (ms: number) => new Date(ms).toISOString()

describe('Given the first start of the API on a Wednesday in São Paulo', () => {
  describe('When the start of the first period is asked', () => {
    it('Then should be the Monday at 00:00 of that week, in UTC', () => {
      expect(iso(firstPeriodStartOf(Date.parse('2026-11-25T13:00:00.000Z'), SAO_PAULO))).toBe(
        '2026-11-23T03:00:00.000Z',
      )
    })
  })
})

describe('Given the first start on a Sunday night in São Paulo, already Monday in UTC', () => {
  describe('When the start of the first period is asked', () => {
    it('Then should be the Monday before, by the wall clock of the zone', () => {
      expect(iso(firstPeriodStartOf(Date.parse('2026-11-30T01:00:00.000Z'), SAO_PAULO))).toBe(
        '2026-11-23T03:00:00.000Z',
      )
    })
  })
})

describe('Given the first start exactly at Monday 00:00 in São Paulo', () => {
  describe('When the start of the first period is asked', () => {
    it('Then should be that same instant', () => {
      expect(iso(firstPeriodStartOf(Date.parse('2026-11-23T03:00:00.000Z'), SAO_PAULO))).toBe(
        '2026-11-23T03:00:00.000Z',
      )
    })
  })
})

describe('Given a zone with daylight saving', () => {
  describe('When the first start is in the week after the change', () => {
    it('Then should follow the offset of that Monday', () => {
      expect(iso(firstPeriodStartOf(Date.parse('2026-03-11T15:00:00.000Z'), NEW_YORK))).toBe(
        '2026-03-09T04:00:00.000Z',
      )
    })
  })
})

describe('Given the first period starts at 2026-11-23T03:00Z', () => {
  const firstStartMs = Date.parse('2026-11-23T03:00:00.000Z')

  describe.each([
    [
      'its start',
      '2026-11-23T03:00:00.000Z',
      1,
      '2026-11-23T03:00:00.000Z',
      '2027-02-15T03:00:00.000Z',
    ],
    [
      'its last instant',
      '2027-02-15T02:59:59.999Z',
      1,
      '2026-11-23T03:00:00.000Z',
      '2027-02-15T03:00:00.000Z',
    ],
    [
      'its end',
      '2027-02-15T03:00:00.000Z',
      2,
      '2027-02-15T03:00:00.000Z',
      '2027-05-10T03:00:00.000Z',
    ],
    [
      'the third period',
      '2027-06-01T12:00:00.000Z',
      3,
      '2027-05-10T03:00:00.000Z',
      '2027-08-02T03:00:00.000Z',
    ],
  ])('When the period of %s is asked', (_label, instant, number, startsAt, endsAt) => {
    it(`Then should be period ${number}, 84 days long`, () => {
      const period = periodAt(firstStartMs, Date.parse(instant))
      expect({
        ...period,
        startsAtMs: iso(period.startsAtMs),
        endsAtMs: iso(period.endsAtMs),
      }).toEqual({
        number,
        startsAtMs: startsAt,
        endsAtMs: endsAt,
      })
    })
  })

  describe('When the period of an instant before it is asked', () => {
    it('Then should be the first period', () => {
      expect(periodAt(firstStartMs, Date.parse('2026-11-20T00:00:00.000Z')).number).toBe(1)
    })
  })

  describe.each([
    ['its start', '2026-11-23T03:00:00.000Z', 1],
    ['the Sunday of the first week', '2026-11-30T02:59:59.999Z', 1],
    ['the second Monday', '2026-11-30T03:00:00.000Z', 2],
    ['its last day', '2027-02-14T12:00:00.000Z', 12],
    ['an instant before it', '2026-11-20T00:00:00.000Z', 1],
    ['an instant after it', '2027-03-01T00:00:00.000Z', 12],
  ])('When the week of %s is asked', (_label, instant, week) => {
    it(`Then should be week ${week} of 12`, () => {
      expect(weekOfPeriod(firstStartMs, Date.parse(instant))).toBe(week)
    })
  })
})
