import { describe, expect, it } from 'vitest'
import type { VolumeSet } from '../windows/volume.rules.js'
import type { GroupTraining } from '../windows/window.rules.js'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { periodVolumeOf, periodWindowsOf } from './period-stats.rules.js'

// With no volume, a hypertrophy window opens 24 h and closes 120 h after the training.
const STARTS_AT_MS = Date.parse('2025-03-03T03:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const at = (iso: string) => Date.parse(iso)

const training = (workoutId: string, trainedAt: string): GroupTraining => ({
  workoutId,
  letter: 'A',
  trainedAtMs: at(trainedAt),
  goal: 'hypertrophy',
  volumeG: 0,
})

const windowsOf = (trainingsOfGroups: Map<string, GroupTraining[]>, nowMs: number) =>
  periodWindowsOf({
    trainingsOfGroups,
    parameters: GAME_PARAMETERS,
    startsAtMs: STARTS_AT_MS,
    nowMs,
  })

describe('Given back used a window and chest missed one in the period', () => {
  const trainings = new Map([
    [
      'back',
      [training('b1', '2025-03-03T10:00:00.000Z'), training('b2', '2025-03-05T10:00:00.000Z')],
    ],
    ['chest', [training('c1', '2025-03-04T10:00:00.000Z')]],
  ])

  describe('When the windows of the period are counted in week 3', () => {
    const windows = windowsOf(trainings, STARTS_AT_MS + 15 * DAY_MS)

    it('Then the period should have 1 of 3 windows used, or 33%', () => {
      expect(windows.total).toEqual({ windowsUsed: 1, windowsMissed: 2, usedPercent: 33 })
    })

    it('Then each group should have its own rate in the period', () => {
      expect(Object.fromEntries(windows.byGroup)).toEqual({
        back: { windowsUsed: 1, windowsMissed: 1, usedPercent: 50 },
        chest: { windowsUsed: 0, windowsMissed: 1, usedPercent: 0 },
      })
    })
  })
})

describe('Given a window used and another missed before the period', () => {
  const trainings = new Map([
    [
      'back',
      [training('b1', '2025-02-20T10:00:00.000Z'), training('b2', '2025-02-22T10:00:00.000Z')],
    ],
  ])

  describe('When the windows of the period are counted', () => {
    it('Then they should stay out of the period', () => {
      expect(windowsOf(trainings, STARTS_AT_MS + 15 * DAY_MS).total).toEqual({
        windowsUsed: 0,
        windowsMissed: 0,
        usedPercent: null,
      })
    })
  })
})

describe('Given a window still open now', () => {
  const trainings = new Map([['back', [training('b1', '2025-03-03T10:00:00.000Z')]]])

  describe('When the windows of the period are counted', () => {
    it('Then the open window should stay out of the rate', () => {
      expect(windowsOf(trainings, at('2025-03-05T10:00:00.000Z')).total).toEqual({
        windowsUsed: 0,
        windowsMissed: 0,
        usedPercent: null,
      })
    })
  })
})

const set = (
  performedAt: string,
  loadG: number,
  reps: number | null,
  seconds: number | null = null,
) =>
  ({
    performedAtMs: at(performedAt),
    loadG,
    reps,
    seconds,
    primaryGroupSlugs: ['chest'],
    secondaryGroupSlugs: ['triceps'],
  }) satisfies VolumeSet & { performedAtMs: number }

const volumeOf = (sets: ReturnType<typeof set>[], nowMs: number) =>
  periodVolumeOf({ sets, parameters: GAME_PARAMETERS, startsAtMs: STARTS_AT_MS, nowMs })

describe('Given 1000 kg in week 1 and 1200 kg in week 2, counting the secondary group at half', () => {
  const sets = [
    set('2025-03-04T10:00:00.000Z', 100_000, 10),
    set('2025-03-11T10:00:00.000Z', 120_000, 10),
    set('2025-03-11T10:05:00.000Z', 50_000, null, 60),
  ]

  describe('When the volume of the period is read in week 3', () => {
    it('Then should compare the last complete week with week 1, with the time out of the volume', () => {
      expect(volumeOf(sets, STARTS_AT_MS + 15 * DAY_MS)).toEqual({
        baselineVolumeG: 1_500_000,
        lastWeekVolumeG: 1_800_000,
        changePercent: 20,
      })
    })
  })

  describe('When the volume of the period is read in week 1', () => {
    it('Then should have no baseline yet', () => {
      expect(volumeOf(sets, STARTS_AT_MS + 2 * DAY_MS)).toEqual({
        baselineVolumeG: null,
        lastWeekVolumeG: null,
        changePercent: null,
      })
    })
  })

  describe('When the volume of the period is read in week 2', () => {
    it('Then the last complete week should be week 1, with no change', () => {
      expect(volumeOf(sets, STARTS_AT_MS + 8 * DAY_MS)).toEqual({
        baselineVolumeG: 1_500_000,
        lastWeekVolumeG: 1_500_000,
        changePercent: 0,
      })
    })
  })
})

describe('Given no volume in week 1', () => {
  describe('When the volume of the period is read in week 3', () => {
    it('Then the change should be null', () => {
      expect(
        volumeOf([set('2025-03-11T10:00:00.000Z', 120_000, 10)], STARTS_AT_MS + 15 * DAY_MS),
      ).toEqual({ baselineVolumeG: 0, lastWeekVolumeG: 1_800_000, changePercent: null })
    })
  })
})
