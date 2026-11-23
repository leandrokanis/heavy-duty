import { describe, expect, it } from 'vitest'
import { windowBadgesOf } from './window-badges'
import type { ActivityWindows, GroupWindow } from './windows.types'

const OPENS_AT = '2026-11-22T09:00:00.000Z'
const CLOSES_AT = '2026-11-24T09:00:00.000Z'
const OPENS_AT_MS = Date.parse(OPENS_AT)
const CLOSES_AT_MS = Date.parse(CLOSES_AT)

const CHEST = { slug: 'chest', name: 'peito' }
const BACK = { slug: 'back', name: 'costas' }

// The stored state is wrong on purpose: the badge must come from the instants.
function windowsOf(...groups: Array<Pick<GroupWindow, 'muscleGroup'> & Partial<GroupWindow>>) {
  return {
    now: '2026-11-21T00:00:00.000Z',
    groups: groups.map((group) => ({
      state: 'none' as const,
      lastTrainedAt: '2026-11-21T00:00:00.000Z',
      opensAt: OPENS_AT,
      closesAt: CLOSES_AT,
      ...group,
    })),
  } satisfies ActivityWindows
}

describe('Given the chest window opens at 09:00 on the 22nd and closes at 09:00 on the 24th', () => {
  describe('When the badges are computed one millisecond before it opens', () => {
    it('Then chest should be resting until the opening', () => {
      expect(windowBadgesOf([CHEST], windowsOf({ muscleGroup: CHEST }), OPENS_AT_MS - 1)).toEqual([
        { ...CHEST, state: 'resting', atMs: OPENS_AT_MS },
      ])
    })
  })

  describe('When the badges are computed exactly at the opening', () => {
    it('Then chest should be open until the closing', () => {
      expect(windowBadgesOf([CHEST], windowsOf({ muscleGroup: CHEST }), OPENS_AT_MS)).toEqual([
        { ...CHEST, state: 'open', atMs: CLOSES_AT_MS },
      ])
    })
  })

  describe('When the badges are computed one millisecond before it closes', () => {
    it('Then chest should still be open', () => {
      expect(
        windowBadgesOf([CHEST], windowsOf({ muscleGroup: CHEST }), CLOSES_AT_MS - 1)[0]?.state,
      ).toBe('open')
    })
  })

  describe('When the badges are computed exactly at the closing', () => {
    it('Then chest should be cooling since the closing', () => {
      expect(windowBadgesOf([CHEST], windowsOf({ muscleGroup: CHEST }), CLOSES_AT_MS)).toEqual([
        { ...CHEST, state: 'cooling', atMs: CLOSES_AT_MS },
      ])
    })
  })
})

describe('Given a letter with chest, back and a group the API does not list', () => {
  describe('When back was never trained and has no instants', () => {
    it('Then should return a badge for chest only, in the order of the letter', () => {
      const windows = windowsOf(
        { muscleGroup: CHEST },
        { muscleGroup: BACK, lastTrainedAt: null, opensAt: null, closesAt: null },
      )
      const unlisted = { slug: 'abs', name: 'abdômen' }

      expect(
        windowBadgesOf([unlisted, BACK, CHEST], windows, OPENS_AT_MS).map(({ slug }) => slug),
      ).toEqual(['chest'])
    })
  })
})
