import { describe, expect, it } from 'vitest'
import { muscleGroupsOfDay } from './muscle-groups-of-day'
import { CRUCIFIXO, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'

describe('Given a letter with supino-reto (chest), triceps-polia (triceps), crucifixo (chest) and prancha (abs)', () => {
  describe('When the groups of the letter are listed', () => {
    it('Then should return each group once, in order of first appearance', () => {
      const day = todayDay('A', 'Superior', [SUPINO_RETO, TRICEPS_POLIA, CRUCIFIXO, PRANCHA])

      expect(muscleGroupsOfDay(day).map(({ slug }) => slug)).toEqual(['chest', 'triceps', 'abs'])
    })
  })
})

describe('Given a letter from a copy saved before the exercises had muscle groups', () => {
  describe('When the groups of the letter are listed', () => {
    it('Then should return no group instead of failing', () => {
      const { muscleGroups: _, ...withoutGroups } = SUPINO_RETO
      const day = todayDay('A', 'Superior', [withoutGroups as typeof SUPINO_RETO])

      expect(muscleGroupsOfDay(day)).toEqual([])
    })
  })
})
