import { describe, expect, it } from 'vitest'
import { type StreakWeek, weekStreakOf } from './week-streak.rules.js'

const week = (
  periodNumber: number,
  weeklyGoal: number | null,
  windowsUsed: number,
  finished = true,
): StreakWeek => ({ periodNumber, weeklyGoal, windowsUsed, finished })

const statusesOf = (weeks: StreakWeek[]) => weekStreakOf(weeks).statuses

describe('Given the goal met in the last 3 weeks (US-F11-03)', () => {
  const weeks = [week(1, 2, 0), week(1, 2, 2), week(1, 2, 3), week(1, 2, 2), week(1, 2, 0, false)]

  describe('When the streak is read in the current week, still below the goal', () => {
    it('Then the streak should be 3 weeks, with the protection kept', () => {
      expect(weekStreakOf(weeks)).toEqual({
        weeks: 3,
        protectionUsed: false,
        statuses: ['missed', 'met', 'met', 'met', 'pending'],
      })
    })
  })

  describe('When the current week meets the goal', () => {
    it('Then the current week should count at once', () => {
      expect(weekStreakOf([...weeks.slice(0, 4), week(1, 2, 2, false)]).weeks).toBe(4)
    })
  })
})

describe('Given a streak of 5 weeks and the protection of the period not used', () => {
  const five = Array.from({ length: 5 }, () => week(1, 1, 1))

  describe('When a week ends with the goal not met', () => {
    it('Then the streak should stay at 5 and the protection should be used', () => {
      expect(weekStreakOf([...five, week(1, 1, 0)])).toEqual({
        weeks: 5,
        protectionUsed: true,
        statuses: ['met', 'met', 'met', 'met', 'met', 'protected'],
      })
    })
  })

  describe('When a second week ends with the goal not met in the same period', () => {
    it('Then the streak should go back to zero', () => {
      const result = weekStreakOf([...five, week(1, 1, 0), week(1, 1, 1), week(1, 1, 0)])
      expect([result.weeks, result.protectionUsed, result.statuses.at(-1)]).toEqual([
        0,
        true,
        'missed',
      ])
    })
  })

  describe('When the next period starts after the protection was used', () => {
    it('Then the protection should come back and the streak should cross the periods', () => {
      const result = weekStreakOf([...five, week(1, 1, 0), week(2, 1, 1), week(2, 1, 0)])
      expect([result.weeks, result.protectionUsed, result.statuses.at(-1)]).toEqual([
        6,
        true,
        'protected',
      ])
    })
  })
})

describe('Given a week with no goal between met weeks', () => {
  describe('When the streak is read', () => {
    it('Then the week should be neutral: it neither adds nor breaks', () => {
      expect(weekStreakOf([week(1, 1, 1), week(1, null, 0), week(1, 1, 1)])).toEqual({
        weeks: 2,
        protectionUsed: false,
        statuses: ['met', 'neutral', 'met'],
      })
    })
  })
})

describe('Given the streak at zero', () => {
  describe('When a week ends with the goal not met', () => {
    it('Then the protection should stay unused', () => {
      expect(weekStreakOf([week(1, 1, 0)])).toEqual({
        weeks: 0,
        protectionUsed: false,
        statuses: ['missed'],
      })
    })
  })
})

describe('Given the current week with no goal', () => {
  describe('When the streak is read', () => {
    it('Then the week should be neutral', () => {
      expect(statusesOf([week(1, null, 3, false)])).toEqual(['neutral'])
    })
  })
})
