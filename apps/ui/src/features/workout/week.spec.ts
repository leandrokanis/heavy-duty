import { describe, expect, it } from 'vitest'
import { countOfThisWeek, weekStartOf } from './week'

// Local dates, so the test holds in any time zone of the machine.
const local = (day: number, hours = 0, minutes = 0) =>
  new Date(2026, 10, day, hours, minutes).getTime()

describe('Given an instant of the week of Monday, November 23 of 2026, in the time zone of the device', () => {
  describe.each([
    { case: 'Monday at 00:00', nowMs: local(23) },
    { case: 'Wednesday at 15:30', nowMs: local(25, 15, 30) },
    { case: 'Sunday at 23:59', nowMs: local(29, 23, 59) },
  ])('When the start of the week is computed on $case', ({ nowMs }) => {
    it('Then should be Monday, November 23, at 00:00 of the device', () => {
      expect(weekStartOf(nowMs)).toBe(local(23))
    })
  })
})

describe('Given the count of the week of Monday, November 23, read on the device', () => {
  const week = { from: new Date(local(23)).toISOString() }

  describe('When the screen asks for the count on Sunday at 23:59', () => {
    it('Then should keep the count', () => {
      expect(countOfThisWeek(week, local(29, 23, 59))).toBe(week)
    })
  })

  describe('When the screen asks for the count after the next Monday at 00:00', () => {
    it('Then should drop the count of the past week', () => {
      expect(countOfThisWeek(week, local(30))).toBeNull()
    })
  })
})
