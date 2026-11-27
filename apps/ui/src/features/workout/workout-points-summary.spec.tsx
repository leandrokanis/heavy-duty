import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkoutPointsSummary } from './workout-points-summary'

describe('Given a workout of 240 points, second of the period', () => {
  describe('When the summary renders', () => {
    it('Then should be a region "Pontos do treino" that reads "240 pontos" and "2º do período"', () => {
      render(<WorkoutPointsSummary rank={{ points: 240, position: 2 }} />)

      const region = screen.getByRole('region', { name: 'Pontos do treino' })
      expect(region.textContent).toBe('+240 pontos2º do período')
    })
  })
})

describe('Given a workout of 1 point with no ranking known', () => {
  describe('When the summary renders', () => {
    it('Then should read "+1 ponto" with no position', () => {
      render(<WorkoutPointsSummary rank={{ points: 1, position: null }} />)

      expect(screen.getByRole('region', { name: 'Pontos do treino' }).textContent).toBe('+1 ponto')
    })
  })
})
