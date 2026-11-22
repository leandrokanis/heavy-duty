import { describe, expect, it } from 'vitest'
import { formatDurationMinutes, formatLoadKg, formatRestClock, formatSetShort } from './format'

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

describe('Given the rest left in seconds', () => {
  describe('When it is formatted as a clock', () => {
    it.each([
      [90, '1:30'],
      [5, '0:05'],
      [0, '0:00'],
    ])('Then %i s should read %s', (seconds, expected) => {
      expect(formatRestClock(seconds)).toBe(expected)
    })
  })
})

describe('Given a recorded set', () => {
  describe('When it is formatted in the short form of the screen', () => {
    it.each([
      [{ loadG: 42500, reps: 10 }, '42,5 kg · 10 rep'],
      [{ loadG: 0, seconds: 45 }, '0 kg · 45 s'],
    ])('Then %j should read %s', (set, expected) => {
      expect(formatSetShort(set)).toBe(expected)
    })
  })
})
