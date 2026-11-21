import { describe, expect, it } from 'vitest'
import { formatDurationMinutes, formatLoadKg } from './format'

describe('Given a load in grams', () => {
  describe('When it is formatted in kg', () => {
    it.each([
      [40000, '40'],
      [42500, '42,5'],
      [41250, '41,25'],
      [0, '0'],
    ])('Then %i g should read %s', (loadG, expected) => {
      expect(formatLoadKg(loadG)).toBe(expected)
    })
  })
})

describe('Given a duration in seconds', () => {
  describe('When it is formatted in minutes', () => {
    it.each([
      [675, '11 min'],
      [20, '1 min'],
    ])('Then %i s should read %s', (seconds, expected) => {
      expect(formatDurationMinutes(seconds)).toBe(expected)
    })
  })
})
