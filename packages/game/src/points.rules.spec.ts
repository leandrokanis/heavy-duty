import { describe, expect, it } from 'vitest'
import { isInWindowAt, multiplierPercentOf, type SetPlan, setPointsOf } from './index.ts'

const benchPlan: SetPlan = { plannedLoadG: 40000, targetReps: 10, targetSeconds: null }

describe('setPointsOf', () => {
  describe('Given a plan of 10 reps with 40 kg', () => {
    describe('When the set meets the plan', () => {
      it('Then it yields 10 points', () => {
        expect(setPointsOf({ loadG: 40000, reps: 10, seconds: null }, benchPlan, 100)).toBe(10)
      })
    })

    describe('When the set triples the planned volume', () => {
      it('Then it yields 20 points, the double of the plan', () => {
        expect(setPointsOf({ loadG: 60000, reps: 20, seconds: null }, benchPlan, 100)).toBe(20)
      })
    })

    describe('When the set does half of the planned volume', () => {
      it('Then it yields 5 points', () => {
        expect(setPointsOf({ loadG: 40000, reps: 5, seconds: null }, benchPlan, 100)).toBe(5)
      })
    })

    describe('When the set meets the plan with the double multiplier', () => {
      it('Then it yields 20 points', () => {
        expect(setPointsOf({ loadG: 40000, reps: 10, seconds: null }, benchPlan, 200)).toBe(20)
      })
    })

    describe('When the set triples the plan with the double multiplier', () => {
      it('Then it yields 40 points', () => {
        expect(setPointsOf({ loadG: 60000, reps: 20, seconds: null }, benchPlan, 200)).toBe(40)
      })
    })

    describe('When the ratio falls between two whole points', () => {
      it('Then the points round to the nearest integer', () => {
        // 42.5 kg × 10 over 40 kg × 10 is 10.625 points.
        expect(setPointsOf({ loadG: 42500, reps: 10, seconds: null }, benchPlan, 100)).toBe(11)
      })
    })

    describe('When the set is done with no load', () => {
      it('Then it yields no points, as its volume is zero', () => {
        expect(setPointsOf({ loadG: 0, reps: 10, seconds: null }, benchPlan, 100)).toBe(0)
      })
    })
  })

  describe('Given a plan with load 0', () => {
    const plan: SetPlan = { plannedLoadG: 0, targetReps: 12, targetSeconds: null }

    describe('When the set does 18 reps with an extra load', () => {
      it('Then the ratio uses only the reps', () => {
        expect(setPointsOf({ loadG: 10000, reps: 18, seconds: null }, plan, 100)).toBe(15)
      })
    })
  })

  describe('Given a timed plan of 60 seconds', () => {
    const plan: SetPlan = { plannedLoadG: 0, targetSeconds: 60, targetReps: null }

    describe('When the set lasts 45 seconds', () => {
      it('Then the ratio uses the seconds', () => {
        expect(setPointsOf({ loadG: 0, reps: null, seconds: 45 }, plan, 100)).toBe(8)
      })
    })
  })

  describe('Given a set with no plan', () => {
    describe('When its points are counted', () => {
      it('Then it counts as meeting the plan', () => {
        expect(setPointsOf({ loadG: 30000, reps: 8, seconds: null }, null, 200)).toBe(20)
      })
    })
  })

  describe('Given a plan of reps and a set measured in seconds', () => {
    describe('When its points are counted', () => {
      it('Then the plan does not apply and the set counts as meeting it', () => {
        expect(setPointsOf({ loadG: 0, reps: null, seconds: 30 }, benchPlan, 100)).toBe(10)
      })
    })
  })
})

describe('multiplierPercentOf', () => {
  describe('Given a set inside the window of a group', () => {
    it('Then the points double', () => {
      expect(multiplierPercentOf({ inWindow: true })).toBe(200)
    })
  })

  describe('Given a set outside every window', () => {
    it('Then the points are the common ones', () => {
      expect(multiplierPercentOf({ inWindow: false })).toBe(100)
    })
  })

  describe('Given a window percent above the maximum multiplier', () => {
    it('Then the multiplier stops at the maximum', () => {
      const config = {
        windowPercent: 300,
        outsideWindowPercent: 100,
        welcomeBackPercent: 200,
        muscleMemoryPercent: 200,
        maxMultiplierPercent: 200,
      }

      expect(multiplierPercentOf({ inWindow: true }, config)).toBe(200)
    })
  })

  describe('Given a group below its best level outside the window', () => {
    it('Then the points double by the muscle memory', () => {
      expect(multiplierPercentOf({ inWindow: false, muscleMemory: true })).toBe(200)
    })
  })

  describe('Given a group below its best level inside the window', () => {
    it('Then the points double, and do not quadruple', () => {
      expect(multiplierPercentOf({ inWindow: true, muscleMemory: true, welcomeBack: true })).toBe(
        200,
      )
    })
  })
})

describe('isInWindowAt', () => {
  const window = {
    opensAt: '2026-11-22T18:00:00.000Z',
    closesAt: '2026-11-26T18:00:00.000Z',
  }

  describe('Given an instant before the window opens', () => {
    it('Then the set is outside the window', () => {
      expect(isInWindowAt(window, Date.parse('2026-11-22T17:59:59.999Z'))).toBe(false)
    })
  })

  describe('Given the instant the window opens', () => {
    it('Then the set is inside the window', () => {
      expect(isInWindowAt(window, Date.parse('2026-11-22T18:00:00.000Z'))).toBe(true)
    })
  })

  describe('Given the instant the window closes', () => {
    it('Then the set is already outside the window', () => {
      expect(isInWindowAt(window, Date.parse('2026-11-26T18:00:00.000Z'))).toBe(false)
    })
  })

  describe('Given a group with no window', () => {
    it('Then the set is outside the window', () => {
      expect(
        isInWindowAt({ opensAt: null, closesAt: null }, Date.parse('2026-11-23T12:00:00.000Z')),
      ).toBe(false)
    })
  })
})
