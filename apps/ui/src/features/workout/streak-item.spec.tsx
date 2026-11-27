import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CurrentPeriod } from '@/features/period/period.types'
import { testPeriod } from '@/features/period/test-period'
import { StreakItem, shownStreakOf } from './streak-item'

describe('Given a streak of 1 week with the protection available (US-F11-03)', () => {
  describe('When the item is rendered', () => {
    it('Then should name the week in the singular and show the shield', () => {
      render(<StreakItem streak={{ weeks: 1, protectionUsed: false }} />)

      const item = screen.getByRole('img')
      expect({
        name: item.getAttribute('aria-label'),
        shield: item.querySelector('[data-slot="streak-protection"]') !== null,
      }).toEqual({
        name: '1 semana seguida com a meta cumprida, proteção do período disponível',
        shield: true,
      })
    })
  })
})

describe('Given the protection of the period used', () => {
  describe('When the item is rendered', () => {
    it('Then should not show the shield', () => {
      render(<StreakItem streak={{ weeks: 4, protectionUsed: true }} />)

      expect(screen.getByRole('img').querySelector('[data-slot="streak-protection"]')).toBeNull()
    })
  })
})

describe('Given the copy of the period', () => {
  describe.each([
    ['a streak above 0 and no goal this week', 2, null, true],
    ['a streak at 0 and a goal this week', 0, 3, true],
    ['a streak at 0 and no goal this week', 0, null, false],
  ])('When it has %s', (_label, weeks, weeklyGoal, shown) => {
    it(`Then the strip should ${shown ? 'show' : 'leave out'} the streak`, () => {
      const period = testPeriod({ weekStreak: { weeks, protectionUsed: false } })
      const withGoal = {
        ...period,
        weeks: period.weeks.map((week) => ({ ...week, weeklyGoal })),
      }

      expect(shownStreakOf(withGoal) !== null).toBe(shown)
    })
  })

  describe('When the copy was saved before the streak existed', () => {
    it('Then the strip should leave out the streak', () => {
      const { weeks: _weeks, weekStreak: _streak, ...old } = testPeriod()

      expect(shownStreakOf(old as CurrentPeriod)).toBeNull()
    })
  })
})
