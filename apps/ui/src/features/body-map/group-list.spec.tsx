import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { bodyMapOf } from './body-map'
import { GroupList } from './group-list'
import { groupLevel, groupWindow, NOW_MS, SAO_PAULO } from './test-body-map'

const WINDOWS = {
  now: new Date(NOW_MS).toISOString(),
  groups: [
    groupWindow('chest', { opensIn: -20, closesIn: 83 }),
    groupWindow('quadriceps', { opensIn: -170, closesIn: -50 }),
    groupWindow('calves', null),
  ],
}

function renderList(withLevels: boolean, onSelect = vi.fn()) {
  const levels = withLevels
    ? {
        now: WINDOWS.now,
        groups: [
          groupLevel('chest', { level: 6, muscleMemory: true, bestLevel: 8 }),
          groupLevel('quadriceps', { level: 2, tier: 'bronze', cooling: true }),
          groupLevel('calves', { level: 1, tier: 'bronze', points: 0 }),
        ],
      }
    : null
  render(
    <GroupList
      groups={bodyMapOf(WINDOWS, levels, null, NOW_MS)}
      nowMs={NOW_MS}
      timeZone={SAO_PAULO}
      onSelect={onSelect}
    />,
  )
}

describe('Given chest open with muscle memory, quadriceps cooling and calves never trained', () => {
  describe('When the list of the groups is shown with the levels', () => {
    it('Then each group should be a button named by the group, the state in text and the level', () => {
      renderList(true)

      expect(
        within(screen.getByRole('list', { name: 'Grupos musculares' }))
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label')),
      ).toEqual([
        'Peito, Janela aberta · fecha qui 20h, nível 6, recuperação em dobro',
        'Quadríceps, Esfriando há 2 dias, nível 2',
        'Panturrilhas, Sem treino, nível 1',
      ])
    })

    it('Then the state should be visible as text, beside an indicator with the hatch when cooling', () => {
      renderList(true)

      const quadriceps = screen.getByRole('button', { name: /^Quadríceps/ })

      expect([
        quadriceps.textContent?.includes('Esfriando há 2 dias'),
        quadriceps.querySelector('[data-hatched]') !== null,
        quadriceps.querySelector('[data-cold]') !== null,
      ]).toEqual([true, true, true])
    })
  })

  describe('When the levels are unknown', () => {
    it('Then the rows should show the state with no level', () => {
      renderList(false)

      expect(screen.getByRole('button', { name: /^Peito/ })).toHaveAttribute(
        'aria-label',
        'Peito, Janela aberta · fecha qui 20h',
      )
    })
  })

  describe('When the athlete taps the row of the chest', () => {
    it('Then should select the chest', () => {
      const onSelect = vi.fn()
      renderList(true, onSelect)

      fireEvent.click(screen.getByRole('button', { name: /^Peito/ }))

      expect(onSelect).toHaveBeenCalledWith('chest')
    })
  })
})
