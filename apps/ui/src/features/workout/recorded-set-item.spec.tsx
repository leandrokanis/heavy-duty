import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecordedSetItem } from './recorded-set-item'

function renderInList(set: Parameters<typeof RecordedSetItem>[0]['set']) {
  render(
    <ul>
      <RecordedSetItem set={set} />
    </ul>,
  )
  return screen.getByRole('listitem')
}

describe('Given a recorded set', () => {
  describe('When it has repetitions', () => {
    it('Then should read the number, the load and the repetitions in full', () => {
      const item = renderInList({ setNumber: 1, loadG: 42_500, reps: 10, seconds: null })

      expect(item.textContent).toContain('Série 1: 42,5 kg, 10 repetições')
    })
  })

  describe('When it has seconds', () => {
    it('Then should read the seconds in full', () => {
      const item = renderInList({ setNumber: 2, loadG: 0, reps: null, seconds: 45 })

      expect(item.textContent).toContain('Série 2: 0 kg, 45 segundos')
    })
  })

  describe('When it has a single repetition', () => {
    it('Then should read the singular', () => {
      const item = renderInList({ setNumber: 3, loadG: 100_000, reps: 1 })

      expect(item.textContent).toContain('Série 3: 100 kg, 1 repetição')
    })
  })

  describe('When it is shown', () => {
    it('Then should hide the short figures from the screen reader', () => {
      const item = renderInList({ setNumber: 1, loadG: 42_500, reps: 10 })

      expect(item.querySelector('[aria-hidden="true"]')?.textContent).toBe('Série 142,5 kg10 rep')
    })
  })
})

describe('Given a recorded set that beat a personal record', () => {
  describe('When it is shown', () => {
    it('Then should read the set as a record', () => {
      const item = renderInList({ setNumber: 2, loadG: 45_000, reps: 10, record: true })

      expect(item.textContent).toContain('Série 2: 45 kg, 10 repetições, recorde')
    })
  })
})
