import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { testPeriod } from '@/features/period/test-period'
import { WeekPointsItem, weekPointsOf } from './week-points-item'

// Week 2 of the test period goes from 2026-11-30 03:00 to 2026-12-07 03:00 UTC.
const IN_WEEK_2_MS = Date.parse('2026-12-02T15:00:00.000Z')

describe('Given 420 points in the week (US-F19-02, D102)', () => {
  describe('When the item is rendered', () => {
    it('Then should read "420 pontos na semana"', () => {
      render(<WeekPointsItem points={420} />)

      expect(screen.getByRole('img').getAttribute('aria-label')).toBe('420 pontos na semana')
    })
  })
})

describe('Given the copy of the period with 240 points in week 2', () => {
  const period = testPeriod()

  describe('When the strip reads it during week 2', () => {
    it('Then the points of the week should be 240', () => {
      expect(weekPointsOf(period, IN_WEEK_2_MS)).toBe(240)
    })
  })

  describe('When the strip reads it after week 2 ended', () => {
    it('Then the week should have no points known', () => {
      expect(weekPointsOf(period, Date.parse('2026-12-07T03:00:00.000Z'))).toBeNull()
    })
  })
})

describe('Given no copy of the period', () => {
  it('Then the week should have no points known', () => {
    expect(weekPointsOf(null, IN_WEEK_2_MS)).toBeNull()
  })
})
