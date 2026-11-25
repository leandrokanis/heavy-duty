import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MuscleGroupLevel } from '@/features/workout/levels.types'
import { bodyMapOf } from './body-map'
import { GroupSheet } from './group-sheet'
import { groupLevel, groupWindow, NOW_MS, SAO_PAULO } from './test-body-map'

const HOUR_MS = 3_600_000

function chestWith(
  hours: { opensIn: number; closesIn: number; trainedAgo?: number } | null,
  level: MuscleGroupLevel | null,
) {
  const windows = { now: '', groups: [groupWindow('chest', hours)] }
  const levels = level ? { now: '', groups: [level] } : null
  return bodyMapOf(windows, levels, null, NOW_MS)[0] ?? null
}

function renderSheet(group: ReturnType<typeof chestWith>, onClose = vi.fn()) {
  render(<GroupSheet group={group} nowMs={NOW_MS} timeZone={SAO_PAULO} onClose={onClose} />)
  return screen.getByRole('dialog', { name: 'Peito' })
}

function detailsOf(dialog: HTMLElement): Record<string, string> {
  const terms = within(dialog).getAllByRole('term')
  return Object.fromEntries(
    terms.map((term) => [term.textContent, term.nextElementSibling?.textContent ?? '']),
  )
}

describe('Given chest open until Thursday 20h, at level 6 with 26 of 55 points and best level 8', () => {
  const group = chestWith(
    { opensIn: -20, closesIn: 83, trainedAgo: 50 },
    groupLevel('chest', { level: 6, points: 26, bestLevel: 8, muscleMemory: true }),
  )

  describe('When the athlete opens the detail of the chest', () => {
    it('Then should show the level, the bar, the best level with ↺ ×2, the window and the last workout', () => {
      const dialog = renderSheet(group)

      expect({
        state: within(dialog).getByText('Janela aberta · fecha qui 20h') !== null,
        bar: within(dialog)
          .getByRole('progressbar', { name: 'Nível de peito' })
          .getAttribute('aria-valuetext'),
        details: detailsOf(dialog),
      }).toEqual({
        state: true,
        bar: 'Nível 6, 26 de 55 pontos',
        details: {
          'Melhor nível': '8↺ ×2',
          Janela: 'Fecha qui 20h',
          'Último treino': 'Sáb., 21 de nov.',
        },
      })
    })
  })

  describe('When the athlete taps "Fechar"', () => {
    it('Then should close the detail', () => {
      const onClose = vi.fn()
      renderSheet(group, onClose)

      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

      expect(onClose).toHaveBeenCalled()
    })
  })
})

describe('Given chest cooling at level 6, dropping to level 5 tomorrow at 9h', () => {
  const group = chestWith(
    { opensIn: -170, closesIn: -50 },
    groupLevel('chest', {
      cooling: true,
      nextDropAt: new Date(NOW_MS + 24 * HOUR_MS).toISOString(),
    }),
  )

  describe('When the athlete opens the detail of the chest', () => {
    it('Then should show the drop and the time the window closed', () => {
      const details = detailsOf(renderSheet(group))

      expect([details.Queda, details.Janela]).toEqual(['Nível 5 amanhã 9h', 'Fechou há 2 dias'])
    })
  })
})

describe('Given chest never trained and the levels unknown', () => {
  const group = chestWith(null, null)

  describe('When the athlete opens the detail of the chest', () => {
    it('Then should show the state with no level, no window and no workout', () => {
      const dialog = renderSheet(group)

      expect({
        bar: within(dialog).queryByRole('progressbar'),
        details: detailsOf(dialog),
      }).toEqual({ bar: null, details: { Janela: 'Sem treino', 'Último treino': 'Nenhum' } })
    })
  })
})
