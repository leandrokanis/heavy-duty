import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReopenSummary } from './reopen-summary'

// Saturday 18:30 UTC; the rows open on Thursday and on Tuesday at 9h.
const NOW_MS = Date.parse('2026-11-21T18:30:00.000Z')
const CHEST_ROW = {
  slug: 'chest',
  name: 'peito',
  opensAtMs: Date.parse('2026-11-26T09:00:00.000Z'),
}
const TRICEPS_ROW = {
  slug: 'triceps',
  name: 'tríceps',
  opensAtMs: Date.parse('2026-11-24T09:00:00.000Z'),
}

describe('Given the chest reopening Thursday at 9h and the triceps Tuesday at 9h', () => {
  describe('When the summary renders in the UTC time zone', () => {
    it('Then should be a region "Janelas reabrem" whose rows read "Peito, abre quinta às 9h" and "Tríceps, abre terça às 9h"', () => {
      render(<ReopenSummary rows={[CHEST_ROW, TRICEPS_ROW]} nowMs={NOW_MS} timeZone="UTC" />)

      const region = screen.getByRole('region', { name: 'Janelas reabrem' })
      expect(
        within(region)
          .getAllByRole('img')
          .map((row) => row.getAttribute('aria-label')),
      ).toEqual(['Peito, abre quinta às 9h', 'Tríceps, abre terça às 9h'])
    })

    it('Then should show "abre qui 9h" and "abre ter 9h" as the visible text', () => {
      render(<ReopenSummary rows={[CHEST_ROW, TRICEPS_ROW]} nowMs={NOW_MS} timeZone="UTC" />)

      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        'Peitoabre qui 9h',
        'Trícepsabre ter 9h',
      ])
    })
  })
})

describe('Given a group that opens in 110,5 h and another in 62,5 h', () => {
  describe('When the summary renders', () => {
    it('Then the bars should be 100% and 57% wide, relative to the longest', () => {
      render(<ReopenSummary rows={[CHEST_ROW, TRICEPS_ROW]} nowMs={NOW_MS} timeZone="UTC" />)

      const widths = screen
        .getAllByRole('listitem')
        .map((item) => item.querySelector<HTMLElement>('i')?.style.width)
      expect(widths).toEqual(['100%', '57%'])
    })
  })
})

describe('Given no row of reopening', () => {
  describe('When the summary renders', () => {
    it('Then should render nothing', () => {
      const { container } = render(<ReopenSummary rows={[]} nowMs={NOW_MS} timeZone="UTC" />)

      expect(container.textContent).toBe('')
    })
  })
})
