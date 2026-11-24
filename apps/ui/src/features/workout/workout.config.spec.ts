import { describe, expect, it } from 'vitest'
import { REST_FAST_FORWARD_FACTOR, TICK_MS } from './workout.config'

const MS_PER_SECOND = 1000

describe('Given the tick of the phase clock and the factor of the held rest', () => {
  describe('When a second of the held rest is compared to the tick', () => {
    it('Then the second should last longer than a tick, so every second is read and cued', () => {
      expect(MS_PER_SECOND / REST_FAST_FORWARD_FACTOR).toBeGreaterThan(TICK_MS)
    })
  })
})
