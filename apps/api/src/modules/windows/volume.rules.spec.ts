import { describe, expect, it } from 'vitest'
import { volumeByMuscleGroup } from './volume.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'

const repsSet = (overrides = {}) => ({
  loadG: 40000,
  reps: 10 as number | null,
  seconds: null as number | null,
  primaryGroupSlugs: ['chest'],
  secondaryGroupSlugs: [] as string[],
  ...overrides,
})

describe('Given 3 sets of 10 reps with 40,000 g of an exercise with chest as primary group', () => {
  describe('When the volume by muscle group is computed', () => {
    it('Then chest should have volumeG 1200000 and timeSeconds 0', () => {
      const sets = [repsSet(), repsSet(), repsSet()]

      const volume = volumeByMuscleGroup(sets, GAME_PARAMETERS)

      expect(volume.get('chest')).toEqual({ volumeG: 1200000, timeSeconds: 0 })
    })
  })
})

describe('Given an exercise with chest as primary group and triceps as secondary group', () => {
  describe('When the volume of 3 sets of 10 reps with 40,000 g is computed', () => {
    it('Then triceps should have half of the volume, volumeG 600000', () => {
      const sets = Array.from({ length: 3 }, () => repsSet({ secondaryGroupSlugs: ['triceps'] }))

      const volume = volumeByMuscleGroup(sets, GAME_PARAMETERS)

      expect(volume.get('triceps')?.volumeG).toBe(600000)
    })
  })

  describe('When the volume of a set of 1 rep with 1,001 g is computed', () => {
    it('Then triceps should round the half down to 500', () => {
      const sets = [repsSet({ loadG: 1001, reps: 1, secondaryGroupSlugs: ['triceps'] })]

      const volume = volumeByMuscleGroup(sets, GAME_PARAMETERS)

      expect(volume.get('triceps')?.volumeG).toBe(500)
    })
  })
})

describe('Given an exercise whose muscles repeat a muscle group', () => {
  describe.each([
    {
      case: 'a group that is both primary and secondary',
      primaryGroupSlugs: ['back'],
      secondaryGroupSlugs: ['back'],
    },
    {
      case: 'two primary muscles of the same group',
      primaryGroupSlugs: ['back', 'back'],
      secondaryGroupSlugs: [],
    },
  ])('When the volume of a set of 10 reps with 40,000 g is computed with $case', (exercise) => {
    it('Then the group should sum the volume of the set once, as primary', () => {
      const volume = volumeByMuscleGroup([repsSet(exercise)], GAME_PARAMETERS)

      expect(volume.get('back')).toEqual({ volumeG: 400000, timeSeconds: 0 })
    })
  })
})

describe('Given 3 sets of 45 s with no load of an exercise with abs as primary group', () => {
  const timeSet = (overrides = {}) =>
    repsSet({
      loadG: 0,
      reps: null,
      seconds: 45,
      primaryGroupSlugs: ['abs'],
      ...overrides,
    })

  describe('When the volume by muscle group is computed', () => {
    it('Then abs should have timeSeconds 135 and volumeG 0', () => {
      const volume = volumeByMuscleGroup([timeSet(), timeSet(), timeSet()], GAME_PARAMETERS)

      expect(volume.get('abs')).toEqual({ volumeG: 0, timeSeconds: 135 })
    })
  })

  describe('When a secondary group is on the exercise', () => {
    it('Then the secondary group should get half of the seconds, rounded down', () => {
      const sets = [timeSet({ seconds: 45, secondaryGroupSlugs: ['lower-back'] })]

      const volume = volumeByMuscleGroup(sets, GAME_PARAMETERS)

      expect(volume.get('lower-back')).toEqual({ volumeG: 0, timeSeconds: 22 })
    })
  })
})
