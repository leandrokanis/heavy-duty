import { describe, expect, it } from 'vitest'
import {
  formatHistoryRange,
  formatWorkoutDate,
  formatWorkoutDateTime,
  workoutMinutesOf,
} from './history-format'

const TZ = 'America/Sao_Paulo'
const NOW_MS = Date.parse('2026-11-23T13:00:00.000Z')

describe('Given the date of a workout', () => {
  describe('When it is in the current year', () => {
    it('Then should show the short weekday, day and month in the device time zone', () => {
      expect(formatWorkoutDate('2026-11-21T21:30:00.000Z', NOW_MS, TZ)).toBe('sáb., 21 de nov.')
    })
  })

  describe('When it is late at night in UTC but still the day before in the time zone', () => {
    it('Then should show the local day', () => {
      expect(formatWorkoutDate('2026-11-22T01:30:00.000Z', NOW_MS, TZ)).toBe('sáb., 21 de nov.')
    })
  })

  describe('When it is in another year', () => {
    it('Then should add the year', () => {
      expect(formatWorkoutDate('2025-12-30T21:30:00.000Z', NOW_MS, TZ)).toBe(
        'ter., 30 de dez. de 2025',
      )
    })
  })

  describe('When the full date and time are asked', () => {
    it('Then should spell the weekday and month and show the time as 18h30', () => {
      expect(formatWorkoutDateTime('2026-11-21T21:30:00.000Z', NOW_MS, TZ)).toBe(
        'sábado, 21 de novembro, 18h30',
      )
    })
  })

  describe('When the full date is in another year', () => {
    it('Then should add the year', () => {
      expect(formatWorkoutDateTime('2025-12-30T10:05:00.000Z', NOW_MS, TZ)).toBe(
        'terça-feira, 30 de dezembro de 2025, 7h05',
      )
    })
  })
})

describe('Given the start and the end of a workout', () => {
  describe('When the workout has an end', () => {
    it('Then should return the whole minutes between them', () => {
      expect(
        workoutMinutesOf({
          startedAt: '2026-11-21T21:30:00.000Z',
          finishedAt: '2026-11-21T22:22:20.000Z',
        }),
      ).toBe(52)
    })
  })

  describe('When the workout lasted less than a minute', () => {
    it('Then should return 1', () => {
      expect(
        workoutMinutesOf({
          startedAt: '2026-11-21T21:30:00.000Z',
          finishedAt: '2026-11-21T21:30:10.000Z',
        }),
      ).toBe(1)
    })
  })

  describe('When the workout has no end', () => {
    it('Then should return null', () => {
      expect(workoutMinutesOf({ startedAt: '2026-11-21T21:30:00.000Z', finishedAt: null })).toBe(
        null,
      )
    })
  })
})

describe('Given a history page with no workout', () => {
  describe('When its interval is shown', () => {
    it('Then should show the first and the last day, the last one with the year', () => {
      expect(
        formatHistoryRange(
          {
            fromMs: Date.parse('2026-05-24T13:00:00.000Z'),
            toMs: Date.parse('2026-08-24T13:00:00.000Z'),
          },
          TZ,
        ),
      ).toBe('24 de mai. a 24 de ago. de 2026')
    })
  })
})
