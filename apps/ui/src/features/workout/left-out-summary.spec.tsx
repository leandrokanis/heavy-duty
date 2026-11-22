import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LeftOutSummary } from './left-out-summary'
import type { LeftOutItem } from './workout-flow'

const PRANCHA: LeftOutItem = {
  plannedExerciseId: 'planned-prancha',
  name: 'Prancha',
  setsDone: 0,
  setsTotal: 3,
  skippedAt: '2026-11-21T18:40:00.000Z',
}

describe('Given the exercise Prancha skipped and not done, with 0 of 3 sets', () => {
  describe('When the summary renders', () => {
    it('Then should be a region "Ficaram de fora" with a level 2 heading of the same name', () => {
      render(<LeftOutSummary items={[PRANCHA]} />)

      const region = screen.getByRole('region', { name: 'Ficaram de fora' })
      expect(within(region).getByRole('heading', { level: 2 }).textContent).toBe('Ficaram de fora')
    })

    it('Then the item should read "Prancha0 de 3"', () => {
      render(<LeftOutSummary items={[PRANCHA]} />)

      expect(screen.getByRole('listitem').textContent).toBe('Prancha0 de 3')
    })

    it('Then the skip mark and the pips should sit inside hidden elements', () => {
      render(<LeftOutSummary items={[PRANCHA]} />)

      const item = screen.getByRole('listitem')
      expect({
        mark: item.querySelector('svg')?.closest('[aria-hidden="true"]') !== null,
        pips: item.querySelector('[data-pip]')?.closest('[aria-hidden="true"]') !== null,
      }).toEqual({ mark: true, pips: true })
    })
  })
})

describe('Given an exercise left out with 1 of 3 sets done', () => {
  describe('When the summary renders', () => {
    it('Then exactly one pip should be marked as recorded', () => {
      render(<LeftOutSummary items={[{ ...PRANCHA, setsDone: 1 }]} />)

      expect(document.querySelectorAll('[data-pip][data-recorded="true"]').length).toBe(1)
    })
  })
})

describe('Given no exercise left out', () => {
  describe('When the summary renders', () => {
    it('Then should render nothing', () => {
      const { container } = render(<LeftOutSummary items={[]} />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})
