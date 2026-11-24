import { describe, expect, it } from 'vitest'
import { type SuggestionInput, suggestLetterByWindows, windowStateAt } from './index.ts'

const HOUR_MS = 60 * 60 * 1000
const NOW_MS = Date.parse('2026-11-24T12:00:00.000Z')

function windowAround(opensInHours: number, closesInHours: number) {
  return {
    opensAt: new Date(NOW_MS + opensInHours * HOUR_MS).toISOString(),
    closesAt: new Date(NOW_MS + closesInHours * HOUR_MS).toISOString(),
  }
}

describe('windowStateAt', () => {
  describe('Given a window that opens in one hour', () => {
    it('Then the group is resting', () => {
      expect(windowStateAt(windowAround(1, 97), NOW_MS)).toBe('resting')
    })
  })

  describe('Given a window that opens right now', () => {
    it('Then the group is in its window', () => {
      expect(windowStateAt(windowAround(0, 96), NOW_MS)).toBe('open')
    })
  })

  describe('Given a window that closes right now', () => {
    it('Then the group is cooling', () => {
      expect(windowStateAt(windowAround(-96, 0), NOW_MS)).toBe('cooling')
    })
  })

  describe('Given a group never trained', () => {
    it('Then the group has no window', () => {
      expect(windowStateAt({ opensAt: null, closesAt: null }, NOW_MS)).toBe('none')
      expect(windowStateAt(undefined, NOW_MS)).toBe('none')
    })
  })
})

const WINDOW_OF = {
  resting: windowAround(10, 106),
  open: windowAround(-30, 66),
  cooling: windowAround(-130, -34),
}

type State = keyof typeof WINDOW_OF

function windowsOf(states: Record<string, State>) {
  return Object.fromEntries(Object.entries(states).map(([slug, state]) => [slug, WINDOW_OF[state]]))
}

function inputOf(overrides: Partial<SuggestionInput>): SuggestionInput {
  return {
    days: [
      { letter: 'A', groupSlugs: ['chest', 'shoulders', 'triceps'] },
      { letter: 'B', groupSlugs: ['back', 'biceps', 'lower-back'] },
      { letter: 'C', groupSlugs: ['quadriceps', 'hamstrings', 'calves'] },
    ],
    windows: {},
    levels: {},
    rotationLetter: 'A',
    nowMs: NOW_MS,
    ...overrides,
  }
}

describe('suggestLetterByWindows', () => {
  describe('Given no workout recorded, so no group has a window', () => {
    it('Then the suggestion is the letter of the program sequence (US-F03-01)', () => {
      expect(suggestLetterByWindows(inputOf({ rotationLetter: 'B' }))).toBe('B')
    })
  })

  describe('Given most groups of A resting and most groups of B in their window', () => {
    it('Then B is suggested, though the sequence points to A', () => {
      const windows = windowsOf({
        chest: 'resting',
        shoulders: 'resting',
        triceps: 'open',
        back: 'open',
        biceps: 'open',
        'lower-back': 'resting',
        quadriceps: 'resting',
        hamstrings: 'resting',
        calves: 'resting',
      })

      expect(suggestLetterByWindows(inputOf({ windows, rotationLetter: 'A' }))).toBe('B')
    })
  })

  describe('Given B with groups in their window and C with groups cooling, neither mostly resting', () => {
    it('Then C is suggested, as cooling weighs more than the window', () => {
      const windows = windowsOf({
        chest: 'resting',
        shoulders: 'resting',
        triceps: 'resting',
        back: 'open',
        biceps: 'open',
        'lower-back': 'open',
        quadriceps: 'cooling',
        hamstrings: 'cooling',
        calves: 'cooling',
      })

      expect(suggestLetterByWindows(inputOf({ windows, rotationLetter: 'A' }))).toBe('C')
    })
  })

  describe('Given B and C tied by the windows', () => {
    const windows = windowsOf({
      chest: 'resting',
      shoulders: 'resting',
      triceps: 'resting',
      back: 'open',
      biceps: 'cooling',
      'lower-back': 'open',
      quadriceps: 'cooling',
      hamstrings: 'open',
      calves: 'open',
    })

    describe('When the group of lowest level is in C', () => {
      it('Then C is suggested, though the sequence points to B', () => {
        const levels = {
          back: 6,
          biceps: 5,
          'lower-back': 7,
          quadriceps: 4,
          hamstrings: 8,
          calves: 9,
        }

        expect(suggestLetterByWindows(inputOf({ windows, levels, rotationLetter: 'B' }))).toBe('C')
      })
    })

    describe('When a group of C has no level in the copy', () => {
      it('Then it counts as level 1 and C is suggested', () => {
        const levels = { back: 2, biceps: 2, 'lower-back': 2, quadriceps: 3, hamstrings: 3 }

        expect(suggestLetterByWindows(inputOf({ windows, levels, rotationLetter: 'B' }))).toBe('C')
      })
    })
  })

  describe('Given B and C tied by the windows and by the weakest group', () => {
    const windows = windowsOf({
      chest: 'resting',
      shoulders: 'resting',
      triceps: 'resting',
      back: 'open',
      biceps: 'open',
      'lower-back': 'open',
      quadriceps: 'open',
      hamstrings: 'open',
      calves: 'open',
    })

    describe('When the sequence points to C', () => {
      it('Then C is suggested', () => {
        expect(suggestLetterByWindows(inputOf({ windows, rotationLetter: 'C' }))).toBe('C')
      })
    })

    describe('When the sequence points to A, which is mostly resting', () => {
      it('Then B is suggested, the next one in the sequence', () => {
        expect(suggestLetterByWindows(inputOf({ windows, rotationLetter: 'A' }))).toBe('B')
      })
    })
  })

  describe('Given every letter mostly resting', () => {
    const windows = windowsOf({
      chest: 'resting',
      shoulders: 'resting',
      triceps: 'open',
      back: 'resting',
      biceps: 'resting',
      'lower-back': 'resting',
      quadriceps: 'resting',
      hamstrings: 'resting',
      calves: 'resting',
    })

    it('Then every letter competes by the same score, and A is suggested', () => {
      expect(suggestLetterByWindows(inputOf({ windows, rotationLetter: 'B' }))).toBe('A')
    })

    describe('When the program also has a letter with no exercises', () => {
      it('Then the empty letter is never suggested', () => {
        const days = [...inputOf({}).days, { letter: 'D', groupSlugs: [] }]

        expect(suggestLetterByWindows(inputOf({ days, windows, rotationLetter: 'B' }))).toBe('A')
      })
    })
  })

  describe('Given a program of one letter trained an hour ago', () => {
    it('Then the same letter is suggested', () => {
      const days = [{ letter: 'A', groupSlugs: ['chest'] }]
      const windows = windowsOf({ chest: 'resting' })

      expect(suggestLetterByWindows(inputOf({ days, windows, rotationLetter: 'A' }))).toBe('A')
    })
  })
})
