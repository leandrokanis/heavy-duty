import { describe, expect, it } from 'vitest'
import {
  addGroupGain,
  type GroupProgress,
  groupGainOf,
  levelCostOf,
  type SetPlan,
  startingProgress,
  tierOf,
} from './index.ts'

const benchPlan: SetPlan = { plannedLoadG: 40000, targetReps: 10, targetSeconds: null }
const atPlan = { loadG: 40000, reps: 10, seconds: null }

describe('levelCostOf', () => {
  describe('Given the level n', () => {
    it('Then it costs 40 + 3 × (n − 1) points', () => {
      expect([1, 2, 3, 20].map((level) => levelCostOf(level))).toEqual([40, 43, 46, 97])
    })
  })
})

describe('tierOf', () => {
  describe('Given the levels at the borders of the tiers', () => {
    it('Then bronze goes to 4, silver to 10, gold to 16 and violet to 20', () => {
      expect([1, 4, 5, 10, 11, 16, 17, 20].map((level) => tierOf(level))).toEqual([
        'bronze',
        'bronze',
        'silver',
        'silver',
        'gold',
        'gold',
        'violet',
        'violet',
      ])
    })
  })
})

describe('groupGainOf', () => {
  describe('Given a primary group with 6 planned sets in the letter', () => {
    describe('When a set meets the plan', () => {
      it('Then the group gains 10', () => {
        expect(groupGainOf(atPlan, benchPlan, { role: 'primary', plannedGroupSets: 6 }, 100)).toBe(
          10,
        )
      })
    })
  })

  describe('Given a primary group with 3 planned sets in the letter', () => {
    describe('When a set meets the plan inside the window of the group', () => {
      it('Then the group gains 40, so a complete workout yields 120', () => {
        expect(groupGainOf(atPlan, benchPlan, { role: 'primary', plannedGroupSets: 3 }, 200)).toBe(
          40,
        )
      })
    })
  })

  describe('Given a primary group with 9 planned sets in the letter', () => {
    describe('When a set meets the plan', () => {
      it('Then the gain rounds 6.67 to 7', () => {
        expect(groupGainOf(atPlan, benchPlan, { role: 'primary', plannedGroupSets: 9 }, 100)).toBe(
          7,
        )
      })
    })
  })

  describe('Given a secondary group', () => {
    describe('When a set meets the plan', () => {
      it('Then the group gains half of the set points, with no division by the sets', () => {
        expect(
          groupGainOf(atPlan, benchPlan, { role: 'secondary', plannedGroupSets: 9 }, 100),
        ).toBe(5)
      })
    })
  })

  describe('Given a primary group with no planned set counted', () => {
    describe('When a set meets the plan', () => {
      it('Then the group counts one planned set', () => {
        expect(groupGainOf(atPlan, benchPlan, { role: 'primary', plannedGroupSets: 0 }, 100)).toBe(
          60,
        )
      })
    })
  })
})

describe('addGroupGain', () => {
  describe('Given chest at level 3 with 5 points left to level 4', () => {
    const chest: GroupProgress = { level: 3, points: 41, bestLevel: 3 }

    describe('When the group gains 10', () => {
      it('Then chest goes to level 4 and the bar shows the 5 left over', () => {
        expect(addGroupGain(chest, 10)).toEqual({
          progress: { level: 4, points: 5, bestLevel: 4 },
          levelsReached: [4],
        })
      })
    })
  })

  describe('Given a group at level 1 with no points', () => {
    describe('When the group gains 200', () => {
      it('Then it climbs every level the points pay for, with the rest on the bar', () => {
        expect(addGroupGain(startingProgress(), 200)).toEqual({
          progress: { level: 5, points: 22, bestLevel: 5 },
          levelsReached: [2, 3, 4, 5],
        })
      })
    })
  })

  describe('Given chest at level 20', () => {
    describe('When the group gains 10', () => {
      it('Then chest stays at level 20 with the bar full', () => {
        expect(addGroupGain({ level: 20, points: 97, bestLevel: 20 }, 10)).toEqual({
          progress: { level: 20, points: 97, bestLevel: 20 },
          levelsReached: [],
        })
      })
    })
  })

  describe('Given chest at level 19 close to the top', () => {
    describe('When the group gains more than the cost of level 19', () => {
      it('Then chest reaches level 20 with the bar full', () => {
        expect(addGroupGain({ level: 19, points: 90, bestLevel: 19 }, 50)).toEqual({
          progress: { level: 20, points: 97, bestLevel: 20 },
          levelsReached: [20],
        })
      })
    })
  })

  describe('Given chest below its best level', () => {
    describe('When it climbs one level', () => {
      it('Then the best level stays', () => {
        expect(addGroupGain({ level: 3, points: 45, bestLevel: 8 }, 10).progress.bestLevel).toBe(8)
      })
    })
  })
})
