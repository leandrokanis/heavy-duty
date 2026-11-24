import { describe, expect, it } from 'vitest'
import { coolingLossOf, multiplierPercentOf, nextDropAtMsOf, subtractCoolingLoss } from './index.ts'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

describe('coolingLossOf', () => {
  describe('Given a group cooling for one day', () => {
    it('Then it loses 40 points', () => {
      expect(coolingLossOf(DAY_MS)).toBe(40)
    })
  })

  describe('Given a group cooling for 3 hours', () => {
    it('Then it loses 5 whole points, rounded down', () => {
      expect(coolingLossOf(3 * HOUR_MS)).toBe(5)
    })
  })

  describe('Given the window not closed yet', () => {
    it('Then it loses nothing', () => {
      expect(coolingLossOf(-HOUR_MS)).toBe(0)
    })
  })
})

describe('subtractCoolingLoss', () => {
  describe('Given quadriceps at level 7 with 30 points', () => {
    describe('When it loses 10', () => {
      it('Then the bar goes down to 20 at the same level', () => {
        expect(subtractCoolingLoss({ level: 7, points: 30, bestLevel: 7 }, 10)).toEqual({
          level: 7,
          points: 20,
          bestLevel: 7,
        })
      })
    })

    describe('When the bar reaches zero', () => {
      it('Then quadriceps drops to level 6 with the bar of level 6 full', () => {
        expect(subtractCoolingLoss({ level: 7, points: 30, bestLevel: 7 }, 30)).toEqual({
          level: 6,
          points: 55,
          bestLevel: 7,
        })
      })
    })

    describe('When it loses more than the bar and the level below', () => {
      it('Then it drops as many levels as the loss pays for', () => {
        expect(subtractCoolingLoss({ level: 7, points: 30, bestLevel: 7 }, 100)).toEqual({
          level: 5,
          points: 37,
          bestLevel: 7,
        })
      })
    })
  })

  describe('Given calves at level 1 with 10 points', () => {
    describe('When the bar reaches zero', () => {
      it('Then calves stays at level 1 with an empty bar', () => {
        expect(subtractCoolingLoss({ level: 1, points: 10, bestLevel: 3 }, 50)).toEqual({
          level: 1,
          points: 0,
          bestLevel: 3,
        })
      })
    })
  })

  describe('Given a group at level 20 with the bar full', () => {
    describe('When it loses 40', () => {
      it('Then its bar empties like the others', () => {
        expect(subtractCoolingLoss({ level: 20, points: 97, bestLevel: 20 }, 40)).toEqual({
          level: 20,
          points: 57,
          bestLevel: 20,
        })
      })
    })
  })
})

describe('nextDropAtMsOf', () => {
  const closesAtMs = Date.UTC(2026, 10, 20, 18)

  describe('Given quadriceps at level 7 with 20 points after losing 10 since the close', () => {
    it('Then it drops when the loss reaches 30, 18 hours after the close', () => {
      expect(nextDropAtMsOf(closesAtMs, 10, { level: 7, points: 20, bestLevel: 7 })).toBe(
        closesAtMs + 18 * HOUR_MS,
      )
    })
  })

  describe('Given calves at level 1', () => {
    it('Then it never drops', () => {
      expect(nextDropAtMsOf(closesAtMs, 10, { level: 1, points: 5, bestLevel: 1 })).toBeNull()
    })
  })
})

describe('multiplierPercentOf with the welcome back (D53)', () => {
  describe('Given the first training of a group after it cooled', () => {
    it('Then the gain doubles, as in the window', () => {
      expect(multiplierPercentOf({ inWindow: false, welcomeBack: true })).toBe(200)
    })
  })

  describe('Given the window and the welcome back together', () => {
    it('Then the gain stays at the double, the most', () => {
      expect(multiplierPercentOf({ inWindow: true, welcomeBack: true })).toBe(200)
    })
  })
})
