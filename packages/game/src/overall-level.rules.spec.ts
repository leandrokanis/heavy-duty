import { describe, expect, it } from 'vitest'
import { letterForGroupOf, overallLevelOf, type PlannedDay } from './index.ts'

const at = (slug: string, level: number, points = 0) => ({
  slug,
  progress: { level, points, bestLevel: level },
})

// The 11 groups in catalog order, as the API lists them.
const CATALOG = [
  'chest',
  'back',
  'lower-back',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
]

describe('overallLevelOf', () => {
  describe('Given the program trains chest at level 9, back at 7 and quadriceps at 4', () => {
    it('Then the overall level is 4, limited by quadriceps', () => {
      const levels = [at('chest', 9), at('back', 7), at('quadriceps', 4)]

      expect(overallLevelOf(levels, new Set(['chest', 'back', 'quadriceps']))).toEqual({
        level: 4,
        muscleGroupSlug: 'quadriceps',
      })
    })
  })

  describe('Given calves at level 1 out of the program', () => {
    it('Then calves does not limit the overall level', () => {
      const levels = [at('chest', 9), at('quadriceps', 4), at('calves', 1)]

      expect(overallLevelOf(levels, new Set(['chest', 'quadriceps']))).toEqual({
        level: 4,
        muscleGroupSlug: 'quadriceps',
      })
    })
  })

  describe('Given chest and quadriceps at level 4, quadriceps with less on the bar', () => {
    it('Then quadriceps limits the overall level', () => {
      const levels = [at('chest', 4, 30), at('quadriceps', 4, 10)]

      expect(overallLevelOf(levels, new Set(['chest', 'quadriceps']))?.muscleGroupSlug).toBe(
        'quadriceps',
      )
    })
  })

  describe('Given back and quadriceps at level 1 with an empty bar', () => {
    it('Then the group first in the catalog limits the overall level', () => {
      const levels = CATALOG.map((slug) => at(slug, 1))

      expect(overallLevelOf(levels, new Set(['quadriceps', 'back']))).toEqual({
        level: 1,
        muscleGroupSlug: 'back',
      })
    })
  })

  describe('Given a program with no group in the levels', () => {
    it('Then there is no overall level', () => {
      expect(overallLevelOf([at('chest', 3)], new Set(['back']))).toBeNull()
    })
  })
})

describe('letterForGroupOf', () => {
  const day = (letter: string, ...exercises: [number, string[]][]): PlannedDay => ({
    letter,
    exercises: exercises.map(([sets, muscleGroupSlugs]) => ({ sets, muscleGroupSlugs })),
  })

  describe('Given quadriceps in 3 sets of letter A and 7 sets of letter C', () => {
    it('Then the letter that trains quadriceps the most is C', () => {
      const days = [
        day('A', [3, ['quadriceps']], [3, ['chest']]),
        day('B', [4, ['back']]),
        day('C', [4, ['quadriceps', 'glutes']], [3, ['quadriceps']]),
      ]

      expect(letterForGroupOf(days, 'quadriceps')).toBe('C')
    })
  })

  describe('Given quadriceps in 3 sets of letters A and C', () => {
    it('Then the first letter of the program wins the tie', () => {
      const days = [day('A', [3, ['quadriceps']]), day('C', [3, ['quadriceps']])]

      expect(letterForGroupOf(days, 'quadriceps')).toBe('A')
    })
  })

  describe('Given no letter that trains calves', () => {
    it('Then there is no letter', () => {
      expect(letterForGroupOf([day('A', [3, ['chest']])], 'calves')).toBeNull()
    })
  })
})
