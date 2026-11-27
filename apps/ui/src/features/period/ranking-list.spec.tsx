import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RankedWorkout } from './period.types'
import { RankingList } from './ranking-list'

const ranked = (
  workoutId: string,
  letter: string,
  startedAt: string,
  points: number,
  position: number,
): RankedWorkout => ({ workoutId, letter, startedAt, points, position })

const SIX_WORKOUTS = [
  ranked('w1', 'B', '2026-11-25T13:00:00.000Z', 240, 1),
  ranked('w2', 'A', '2026-11-23T13:00:00.000Z', 180, 2),
  ranked('w3', 'C', '2026-11-27T13:00:00.000Z', 180, 2),
  ranked('w4', 'A', '2026-11-30T13:00:00.000Z', 120, 4),
  ranked('w5', 'B', '2026-12-02T13:00:00.000Z', 90, 5),
  ranked('w6', 'C', '2026-12-04T13:00:00.000Z', 30, 6),
]

describe('Given six workouts in the ranking of the period', () => {
  describe('When the list renders in São Paulo', () => {
    it('Then should list the first 5 in the order of points, each with position, letter, day and points', () => {
      render(<RankingList ranking={SIX_WORKOUTS} timeZone="America/Sao_Paulo" />)

      const list = screen.getByRole('list', { name: 'Ranking dos seus treinos' })
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual([
        'Posição 1Letra Bqua., 25 de nov.240 pontos',
        'Posição 2Letra Aseg., 23 de nov.180 pontos',
        'Posição 2Letra Csex., 27 de nov.180 pontos',
        'Posição 4Letra Aseg., 30 de nov.120 pontos',
        'Posição 5Letra Bqua., 2 de dez.90 pontos',
      ])
    })
  })
})

describe('Given a period with no workout', () => {
  describe('When the list renders', () => {
    it('Then should say that the workouts of the period show here', () => {
      render(<RankingList ranking={[]} />)

      expect(screen.getByText('Os treinos do período aparecem aqui, por pontos.')).toBeTruthy()
    })
  })
})
