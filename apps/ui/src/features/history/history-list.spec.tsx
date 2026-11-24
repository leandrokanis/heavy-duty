import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HistoryList } from './history-list'
import { historyWorkout } from './test-history'

const TZ = 'America/Sao_Paulo'
const NOW_MS = Date.parse('2026-11-23T13:00:00.000Z')

function renderList(workouts = [historyWorkout()]) {
  render(<HistoryList workouts={workouts} nowMs={NOW_MS} timeZone={TZ} />)
  return screen.getByRole('list', { name: 'Treinos' })
}

describe('Given the workouts of the history, newest first', () => {
  describe('When the list is shown', () => {
    it('Then should keep the order it receives', () => {
      const list = renderList([
        historyWorkout({ id: 'w3', letter: 'C', label: 'Pernas' }),
        historyWorkout({ id: 'w2', letter: 'B', label: 'Costas' }),
        historyWorkout({ id: 'w1', letter: 'A', label: 'Peito' }),
      ])

      expect(
        within(list)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual([
        expect.stringMatching(/^CPernas/),
        expect.stringMatching(/^BCostas/),
        expect.stringMatching(/^APeito/),
      ])
    })

    it('Then should link each workout to its detail', () => {
      const list = renderList([historyWorkout({ id: 'w9' })])

      expect(within(list).getByRole('link')).toHaveAttribute('href', '/historico?treino=w9')
    })
  })

  describe('When a workout has a label, a date and an end', () => {
    it('Then should show the letter, the label, the date and the duration', () => {
      const list = renderList()

      expect(within(list).getByRole('link')).toHaveTextContent(
        'APeito e trícepssáb., 21 de nov.52 min',
      )
    })
  })

  describe('When the letter has no label', () => {
    it('Then should name it by the letter', () => {
      const list = renderList([historyWorkout({ letter: 'B', label: null })])

      expect(within(list).getByRole('link')).toHaveTextContent(/^BLetra B/)
    })
  })

  describe('When the workout ended early', () => {
    it('Then should mark it', () => {
      const list = renderList([historyWorkout({ endReason: 'ended_early' })])

      expect(within(list).getByRole('link')).toHaveTextContent(/Encerrado antes$/)
    })
  })

  describe('When the workout has no end', () => {
    it('Then should show no duration', () => {
      const list = renderList([historyWorkout({ finishedAt: null, endReason: null })])

      expect(within(list).getByRole('link')).not.toHaveTextContent('min')
    })
  })
})
