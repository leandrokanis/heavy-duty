import { describe, expect, it } from 'vitest'
import type { MuscleGroupLevels } from './levels.types'
import { overallLevelViewOf } from './overall-level'
import { CHEST, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayBody, todayDay } from './test-today'
import type { ActivityWindows } from './windows.types'

const NOW_MS = Date.parse('2026-11-24T12:00:00.000Z')

function levelsOf(...groups: [string, string, number, number?][]): MuscleGroupLevels {
  return {
    now: '2026-11-24T12:00:00.000Z',
    groups: groups.map(([slug, name, level, points = 0]) => ({
      muscleGroup: { slug, name },
      level,
      points,
      levelCost: 40 + 3 * (level - 1),
      bestLevel: level,
      tier: 'bronze',
    })),
  }
}

function windowsOf(slug: string, opensAt: string, closesAt: string): ActivityWindows {
  return {
    now: '2026-11-24T12:00:00.000Z',
    groups: [
      {
        muscleGroup: { slug, name: slug },
        state: 'resting',
        lastTrainedAt: '2026-11-24T11:00:00.000Z',
        opensAt,
        closesAt,
      },
    ],
  }
}

// Letter A trains chest (3 sets) and abs; letter B trains triceps and chest (6 sets).
const TODAY = todayBody([
  todayDay('A', 'Superior', [SUPINO_RETO, PRANCHA]),
  todayDay('B', 'Empurrar', [TRICEPS_POLIA, { ...SUPINO_RETO, sets: 6, muscleGroups: [CHEST] }]),
])
const LEVELS = levelsOf(
  ['chest', 'peito', 2],
  ['triceps', 'tríceps', 5],
  ['abs', 'abdômen', 3],
  ['calves', 'panturrilhas', 1],
)

describe('overallLevelViewOf', () => {
  describe('Given chest at level 2, the weakest of the program, with no window', () => {
    it('Then the overall level is 2, limited by chest, and leads to letter B, which trains chest the most', () => {
      const view = overallLevelViewOf(TODAY, LEVELS, null, NOW_MS)

      expect({
        level: view?.level,
        tier: view?.tier,
        group: view?.group,
        letter: view?.target.kind === 'letter' ? view.target.day.letter : null,
      }).toEqual({ level: 2, tier: 'bronze', group: CHEST, letter: 'B' })
    })
  })

  describe('Given chest resting, its window opening at 18:00', () => {
    it('Then the overall level leads to the opening, not to a letter', () => {
      const windows = windowsOf('chest', '2026-11-24T18:00:00.000Z', '2026-11-29T11:00:00.000Z')

      expect(overallLevelViewOf(TODAY, LEVELS, windows, NOW_MS)?.target).toEqual({
        kind: 'resting',
        opensAtMs: Date.parse('2026-11-24T18:00:00.000Z'),
      })
    })
  })

  describe('Given chest cooling', () => {
    it('Then the overall level leads to letter B', () => {
      const windows = windowsOf('chest', '2026-11-14T18:00:00.000Z', '2026-11-19T11:00:00.000Z')

      expect(overallLevelViewOf(TODAY, LEVELS, windows, NOW_MS)?.target).toMatchObject({
        kind: 'letter',
        day: { letter: 'B' },
      })
    })
  })

  describe('Given no level known on the device', () => {
    it('Then there is no overall level', () => {
      expect(overallLevelViewOf(TODAY, null, null, NOW_MS)).toBeNull()
    })
  })
})
