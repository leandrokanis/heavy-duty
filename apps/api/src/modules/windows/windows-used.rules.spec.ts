import { describe, expect, it } from 'vitest'
import type { GroupTraining } from './window.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'
import { windowsUsedByWeek } from './windows-used.rules.js'

// With no volume, a hypertrophy window opens 24 h and closes 120 h after the training.
const MONDAY_MS = Date.parse('2025-03-03T03:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const at = (iso: string) => Date.parse(iso)

const training = (workoutId: string, trainedAt: string): GroupTraining => ({
  workoutId,
  letter: 'A',
  trainedAtMs: at(trainedAt),
  goal: 'hypertrophy',
  volumeG: 0,
})

const countOf = (
  trainingsOfGroups: GroupTraining[][],
  { fromMs = MONDAY_MS, weekCount = 1, nowMs = at('2025-03-31T00:00:00.000Z') } = {},
) =>
  windowsUsedByWeek({
    trainingsOfGroups,
    parameters: GAME_PARAMETERS,
    fromMs,
    weekCount,
    nowMs,
  }).map(({ fromMs: weekFromMs, toMs, ...count }) => ({
    from: new Date(weekFromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    ...count,
  }))

describe('Given back trained on Monday and Thursday, with no training in the next week', () => {
  const back = [
    training('w1', '2025-03-03T10:00:00.000Z'),
    training('w2', '2025-03-06T10:00:00.000Z'),
  ]

  describe('When the windows used are counted in the two weeks', () => {
    it('Then the first week should have the window used on Thursday and the second the window missed at its close', () => {
      expect(countOf([back], { weekCount: 2 })).toEqual([
        {
          from: '2025-03-03T03:00:00.000Z',
          to: '2025-03-10T03:00:00.000Z',
          windowsUsed: 1,
          windowsMissed: 0,
          windowsOpen: 0,
          usedPercent: 100,
        },
        {
          from: '2025-03-10T03:00:00.000Z',
          to: '2025-03-17T03:00:00.000Z',
          windowsUsed: 0,
          windowsMissed: 1,
          windowsOpen: 0,
          usedPercent: 0,
        },
      ])
    })
  })
})

describe('Given 10 windows that ended in the week, 7 of them used', () => {
  const used = Array.from({ length: 7 }, (_, index) => [
    training(`u${index}a`, '2025-03-03T10:00:00.000Z'),
    training(`u${index}b`, '2025-03-05T10:00:00.000Z'),
  ])
  const missed = Array.from({ length: 3 }, (_, index) => [
    training(`m${index}`, '2025-02-27T10:00:00.000Z'),
  ])

  describe('When the windows used are counted in the week', () => {
    it('Then the week should show 7 of 10, or 70%', () => {
      expect(countOf([...used, ...missed])[0]).toMatchObject({
        windowsUsed: 7,
        windowsMissed: 3,
        usedPercent: 70,
      })
    })
  })
})

describe('Given no window used or missed in the week', () => {
  describe('When the windows used are counted in the week', () => {
    it('Then the week should show 0 of 0, with no percent', () => {
      expect(countOf([])[0]).toMatchObject({
        windowsUsed: 0,
        windowsMissed: 0,
        windowsOpen: 0,
        usedPercent: null,
      })
    })
  })
})

describe('Given back trained again before its window opened, and the new window still to open', () => {
  const back = [
    training('w1', '2025-03-03T10:00:00.000Z'),
    training('w2', '2025-03-03T20:00:00.000Z'),
  ]

  describe('When the windows used are counted in the week', () => {
    it('Then the replaced and the pending windows should count as neither used nor missed', () => {
      expect(countOf([back], { nowMs: at('2025-03-04T10:00:00.000Z') })[0]).toMatchObject({
        windowsUsed: 0,
        windowsMissed: 0,
        windowsOpen: 0,
        usedPercent: null,
      })
    })
  })
})

describe('Given the window of back open now', () => {
  const back = [training('w1', '2025-03-03T10:00:00.000Z')]
  const nowMs = at('2025-03-05T10:00:00.000Z')

  describe('When the windows used are counted in the week of now and the week before', () => {
    it('Then only the week of now should count it as open, out of the rate', () => {
      expect(
        countOf([back], { fromMs: MONDAY_MS - 7 * DAY_MS, weekCount: 2, nowMs }).map(
          ({ windowsOpen, usedPercent }) => [windowsOpen, usedPercent],
        ),
      ).toEqual([
        [0, null],
        [1, null],
      ])
    })
  })
})

describe('Given back used by a training exactly at the start of a week', () => {
  const back = [
    training('w1', '2025-03-03T10:00:00.000Z'),
    training('w2', '2025-03-06T10:00:00.000Z'),
  ]

  describe('When the weeks start at the instant of that training', () => {
    it('Then the window should count in the week that starts at it, not in the week that ends at it', () => {
      const fromMs = at('2025-03-06T10:00:00.000Z') - 7 * DAY_MS

      expect(
        countOf([back], { fromMs, weekCount: 2 }).map(({ windowsUsed }) => windowsUsed),
      ).toEqual([0, 1])
    })
  })
})
