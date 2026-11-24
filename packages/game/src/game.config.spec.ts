import { describe, expect, it } from 'vitest'
import { GAME_CONFIG } from './index.ts'

describe('GAME_CONFIG', () => {
  describe('Given the starting parameters of wave 6a', () => {
    describe('When a set is recorded outside the window', () => {
      it('Then it yields the common points', () => {
        expect(GAME_CONFIG.outsideWindowPercent).toBe(100)
      })
    })

    describe('When the tiers are listed by their first level', () => {
      it('Then they start at levels 1, 5, 11 and 17 inside the level range', () => {
        const startLevels = Object.values(GAME_CONFIG.tierStartLevels)

        expect(startLevels).toEqual([1, 5, 11, 17])
        expect(startLevels.every((level) => level >= GAME_CONFIG.minLevel)).toBe(true)
        expect(startLevels.every((level) => level <= GAME_CONFIG.maxLevel)).toBe(true)
      })
    })
  })
})
