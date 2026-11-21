import { describe, expect, it } from 'vitest'
import { estimateDurationSeconds, suggestLetter } from './today.rules.js'

const day = (letter: string, exerciseCount = 1) => ({
  letter,
  exercises: Array.from({ length: exerciseCount }, () => ({})),
})

const ABC = [day('A'), day('B'), day('C')]

describe('Given the letters A, B and C, all with exercises', () => {
  describe("When the last workout was letter 'B'", () => {
    it("Then should suggest 'C'", () => {
      expect(suggestLetter(ABC, 'B')).toBe('C')
    })
  })

  describe("When the last workout was letter 'C', the last one in the plan", () => {
    it("Then should suggest 'A', going back to the first letter", () => {
      expect(suggestLetter(ABC, 'C')).toBe('A')
    })
  })

  describe('When there is no last workout', () => {
    it("Then should suggest 'A'", () => {
      expect(suggestLetter(ABC, null)).toBe('A')
    })
  })

  describe("When the last workout was letter 'D', no longer in the program", () => {
    it("Then should suggest 'A', the first letter", () => {
      expect(suggestLetter(ABC, 'D')).toBe('A')
    })
  })
})

describe("Given the letters A, B and C with no exercise in 'B'", () => {
  describe("When the last workout was letter 'A'", () => {
    it("Then should skip 'B' and suggest 'C'", () => {
      expect(suggestLetter([day('A'), day('B', 0), day('C')], 'A')).toBe('C')
    })
  })
})

describe("Given the letters A, B and C with no exercise in 'A'", () => {
  describe("When the last workout was letter 'D', no longer in the program", () => {
    it("Then should suggest 'B', the first letter with exercises", () => {
      expect(suggestLetter([day('A', 0), day('B'), day('C')], 'D')).toBe('B')
    })
  })

  describe('When there is no last workout', () => {
    it("Then should suggest 'B', the first letter with exercises", () => {
      expect(suggestLetter([day('A', 0), day('B'), day('C')], null)).toBe('B')
    })
  })
})

describe('Given letters without any exercise', () => {
  describe("When the last workout was letter 'A'", () => {
    it('Then should suggest no letter', () => {
      expect(suggestLetter([day('A', 0), day('B', 0)], 'A')).toBeNull()
    })
  })
})

describe('Given no letter', () => {
  describe('When there is no last workout', () => {
    it('Then should suggest no letter', () => {
      expect(suggestLetter([], null)).toBeNull()
    })
  })
})

describe('Given supino-reto 3 x 10 with 90 s rest and prancha 3 x 45 s with 60 s rest', () => {
  describe('When the duration of the letter is estimated', () => {
    it('Then should sum 3 x (30 + 90) + 3 x (45 + 60) = 675 seconds', () => {
      const duration = estimateDurationSeconds([
        { sets: 3, targetReps: 10, targetSeconds: null, restSeconds: 90 },
        { sets: 3, targetReps: null, targetSeconds: 45, restSeconds: 60 },
      ])

      expect(duration).toBe(675)
    })
  })
})

describe('Given a letter without exercises', () => {
  describe('When the duration of the letter is estimated', () => {
    it('Then should be 0 seconds', () => {
      expect(estimateDurationSeconds([])).toBe(0)
    })
  })
})
