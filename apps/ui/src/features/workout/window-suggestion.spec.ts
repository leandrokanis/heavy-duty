import { describe, expect, it } from 'vitest'
import type { MuscleGroupLevels } from './levels.types'
import { CHEST, SUPINO_RETO, TRICEPS, TRICEPS_POLIA, todayBody, todayDay } from './test-today'
import { suggestedLetterOf } from './window-suggestion'
import type { ActivityWindows } from './windows.types'

const NOW_MS = Date.parse('2026-11-24T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

const OPEN = {
  opensAt: new Date(NOW_MS - 30 * HOUR_MS).toISOString(),
  closesAt: new Date(NOW_MS + 66 * HOUR_MS).toISOString(),
}
const RESTING = {
  opensAt: new Date(NOW_MS + 10 * HOUR_MS).toISOString(),
  closesAt: new Date(NOW_MS + 106 * HOUR_MS).toISOString(),
}

// The stored state is wrong on purpose: the suggestion must come from the instants.
function windowsOf(bounds: { chest: typeof OPEN; triceps: typeof OPEN }): ActivityWindows {
  return {
    now: '2026-11-20T00:00:00.000Z',
    groups: [
      { muscleGroup: CHEST, state: 'none', lastTrainedAt: null, ...bounds.chest },
      { muscleGroup: TRICEPS, state: 'none', lastTrainedAt: null, ...bounds.triceps },
    ],
  }
}

function levelsOf(chest: number, triceps: number): MuscleGroupLevels {
  const levelOf = (muscleGroup: typeof CHEST, level: number) => ({
    muscleGroup,
    level,
    points: 0,
    levelCost: 40,
    bestLevel: level,
    tier: 'bronze' as const,
  })
  return {
    now: '2026-11-24T12:00:00.000Z',
    groups: [levelOf(CHEST, chest), levelOf(TRICEPS, triceps)],
  }
}

// A trains chest and B trains triceps; the program sequence points to A.
const TODAY = todayBody(
  [todayDay('A', 'Peito', [SUPINO_RETO]), todayDay('B', 'Tríceps', [TRICEPS_POLIA])],
  'A',
)

describe('Given the workout of the day with A for chest and B for triceps, the sequence at A', () => {
  describe('When chest is resting and triceps is in its window', () => {
    it('Then B should be the suggested letter', () => {
      const windows = windowsOf({ chest: RESTING, triceps: OPEN })

      expect(suggestedLetterOf(TODAY, windows, null, NOW_MS)).toBe('B')
    })
  })

  describe('When both are in their window and triceps has the lower level', () => {
    it('Then B should be the suggested letter', () => {
      const windows = windowsOf({ chest: OPEN, triceps: OPEN })

      expect(suggestedLetterOf(TODAY, windows, levelsOf(6, 3), NOW_MS)).toBe('B')
    })
  })

  describe('When there is no copy of the windows', () => {
    it('Then the letter of the program sequence should be suggested', () => {
      expect(suggestedLetterOf(TODAY, null, null, NOW_MS)).toBe('A')
    })
  })
})
