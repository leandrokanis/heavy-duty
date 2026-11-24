import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { historyExercise, historyWorkout } from './test-history'
import { WorkoutDetail } from './workout-detail'

const TZ = 'America/Sao_Paulo'
const NOW_MS = Date.parse('2026-11-23T13:00:00.000Z')

const WORKOUT = historyWorkout({
  exercises: [
    historyExercise('Supino reto', [
      { loadG: 42_500, reps: 10 },
      { loadG: 42_500, reps: 8 },
    ]),
    historyExercise('Prancha', [{ loadG: 0, seconds: 45 }]),
  ],
})

function renderDetail(workout = WORKOUT) {
  return render(<WorkoutDetail workout={workout} nowMs={NOW_MS} timeZone={TZ} />)
}

describe('Given a workout of the history', () => {
  describe('When its detail is shown', () => {
    it('Then should title it by the label', () => {
      renderDetail()

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Peito e tríceps')
    })

    it('Then should show the letter, the date and the start time', () => {
      renderDetail()

      expect(screen.getByText('Letra A · sábado, 21 de novembro, 18h30')).toBeInTheDocument()
    })

    it('Then should sum up the duration, the exercises and the sets', () => {
      renderDetail()
      const summary = screen.getByRole('list', { name: 'Resumo' })

      expect(
        within(summary)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['52 min', '2 exercícios', '3 séries'])
    })

    it('Then should list the exercises in the order of the API', () => {
      renderDetail()

      expect(
        screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
      ).toEqual(['Supino reto', 'Prancha'])
    })

    it('Then should read each set of an exercise in full', () => {
      renderDetail()
      const sets = screen.getByRole('list', { name: 'Séries de Supino reto' })

      expect(
        within(sets)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual([
        expect.stringContaining('Série 1: 42,5 kg, 10 repetições'),
        expect.stringContaining('Série 2: 42,5 kg, 8 repetições'),
      ])
    })

    it('Then should read the seconds of a timed exercise', () => {
      renderDetail()
      const sets = screen.getByRole('list', { name: 'Séries de Prancha' })

      expect(within(sets).getByRole('listitem')).toHaveTextContent('Série 1: 0 kg, 45 segundos')
    })

    it('Then should offer no control that changes the workout', () => {
      renderDetail()

      expect([
        ...screen.queryAllByRole('button'),
        ...screen.queryAllByRole('textbox'),
        ...screen.queryAllByRole('spinbutton'),
        ...screen.queryAllByRole('link'),
      ]).toHaveLength(0)
    })

    it('Then should show no section of exercises left out', () => {
      renderDetail()

      expect(screen.queryByRole('heading', { name: 'Ficaram de fora' })).not.toBeInTheDocument()
    })
  })

  describe('When the letter has no label', () => {
    it('Then should title it by the letter and not repeat it under the title', () => {
      renderDetail(historyWorkout({ label: null }))

      expect([
        screen.getByRole('heading', { level: 1 }).textContent,
        screen.getByText(/^sábado/).textContent,
      ]).toEqual(['Letra A', 'sábado, 21 de novembro, 18h30'])
    })
  })

  describe('When the workout ended early with an exercise left out', () => {
    const ENDED = historyWorkout({
      endReason: 'ended_early',
      exercises: [historyExercise('Supino reto', [{ loadG: 40_000, reps: 10 }])],
      leftOut: [{ id: 'exercise-polia', slug: 'polia', name: 'Tríceps na polia', kind: 'reps' }],
    })

    it('Then should mark it in the summary', () => {
      renderDetail(ENDED)

      expect(
        within(screen.getByRole('list', { name: 'Resumo' })).getByText('Encerrado antes'),
      ).toBeInTheDocument()
    })

    it('Then should list the exercise left out', () => {
      renderDetail(ENDED)
      const section = screen.getByRole('region', { name: 'Ficaram de fora' })

      expect(within(section).getByRole('listitem')).toHaveTextContent('Tríceps na polia')
    })
  })

  describe('When the workout has one exercise with one set and no end', () => {
    it('Then should use the singular and show no duration', () => {
      renderDetail(
        historyWorkout({
          finishedAt: null,
          endReason: null,
          exercises: [historyExercise('Supino reto', [{ loadG: 40_000, reps: 10 }])],
        }),
      )
      const summary = screen.getByRole('list', { name: 'Resumo' })

      expect(
        within(summary)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['1 exercício', '1 série'])
    })
  })
})
