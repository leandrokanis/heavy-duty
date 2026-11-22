import { describe, expect, it } from 'vitest'
import { adjustValue, formatFieldValue, stepsFromDrag, valueTextOf } from './drag-adjust'

describe('Given a field value and a number of steps', () => {
  describe('When the value is adjusted', () => {
    it.each([
      ['loadG', 40_000, 1, 42_500],
      ['reps', 10, -2, 8],
      ['seconds', 45, 1, 50],
      ['loadG', 0, -1, 0],
      ['loadG', 1_000, -1, 0],
      ['loadG', 41_000, 1, 43_500],
      ['reps', 1, -1, 1],
      ['seconds', 1, -3, 1],
      ['seconds', 3, 1, 8],
    ] as const)('Then %s %i with %i steps should be %i', (field, value, steps, expected) => {
      expect(adjustValue(field, value, steps)).toBe(expected)
    })

    it('Then should not pass the largest safe integer', () => {
      expect(adjustValue('loadG', Number.MAX_SAFE_INTEGER - 1_000, 1)).toBe(Number.MAX_SAFE_INTEGER)
    })
  })
})

describe('Given a vertical drag distance and the pixels of one step', () => {
  describe('When the distance becomes steps', () => {
    it.each([
      [22, 1],
      [44, 2],
      [-44, -2],
      [10, 0],
      [11, 1],
      [-11, -1],
      [0, 0],
    ])('Then %i px should be %i steps', (deltaY, expected) => {
      expect(stepsFromDrag(deltaY, 22)).toBe(expected)
    })

    it('Then should never answer negative zero', () => {
      expect(Object.is(stepsFromDrag(-5, 22), -0)).toBe(false)
    })
  })
})

describe('Given a field value in its smallest unit', () => {
  describe('When it is shown and spoken', () => {
    it.each([
      ['loadG', 42_500, '42,5', '42,5 quilos'],
      ['loadG', 40_000, '40', '40 quilos'],
      ['loadG', 1_000, '1', '1 quilo'],
      ['loadG', 0, '0', '0 quilos'],
      ['loadG', 1_500, '1,5', '1,5 quilo'],
      ['loadG', 2_000, '2', '2 quilos'],
      ['reps', 8, '8', '8 repetições'],
      ['reps', 1, '1', '1 repetição'],
      ['seconds', 50, '50', '50 segundos'],
      ['seconds', 1, '1', '1 segundo'],
    ] as const)('Then %s %i should read %s and sound %s', (field, value, shown, spoken) => {
      expect([formatFieldValue(field, value), valueTextOf(field, value)]).toEqual([shown, spoken])
    })
  })
})
