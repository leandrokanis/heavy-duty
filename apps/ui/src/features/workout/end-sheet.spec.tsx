import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EndSheet } from './end-sheet'
import type { SequenceItem } from './workout-flow'

const ITEMS: SequenceItem[] = [
  {
    exerciseIndex: 0,
    name: 'Supino reto',
    status: 'done',
    setsDone: 3,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 1,
    name: 'Crucifixo',
    status: 'skipped',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 2,
    name: 'Tríceps na polia',
    status: 'current',
    setsDone: 1,
    setsTotal: 3,
    recordedSets: [],
  },
]

function renderSheet({ onConfirm = vi.fn(), onContinue = vi.fn() } = {}) {
  render(
    <EndSheet
      open
      items={ITEMS}
      doneSets={4}
      leftSets={5}
      returnFocusRef={{ current: null }}
      onConfirm={onConfirm}
      onContinue={onContinue}
    />,
  )
}

describe('Given the end sheet of a workout with 4 sets done and 5 left', () => {
  describe('When the sheet renders', () => {
    it('Then should be a dialog named "Encerrar o treino"', async () => {
      renderSheet()

      expect(await screen.findByRole('dialog', { name: 'Encerrar o treino' })).toBeInTheDocument()
    })

    it('Then should read "4 séries feitas" and "5 séries que faltam"', async () => {
      renderSheet()

      const dialog = await screen.findByRole('dialog')
      expect([
        within(dialog).getByText('4 séries feitas').textContent,
        within(dialog).getByText('5 séries que faltam').textContent,
      ]).toEqual(['4 séries feitas', '5 séries que faltam'])
    })

    it('Then should draw one hidden segment per exercise, with the Crucifixo as skipped', async () => {
      renderSheet()

      const dialog = await screen.findByRole('dialog')
      const segments = Array.from(dialog.querySelectorAll<HTMLElement>('[data-status]'))
      expect({
        statuses: segments.map((segment) => segment.dataset.status),
        hidden: segments[0]?.closest('[aria-hidden="true"]') !== null,
      }).toEqual({ statuses: ['done', 'skipped', 'current'], hidden: true })
    })

    it('Then should offer "Continuar" and "Encerrar", in this order', async () => {
      renderSheet()

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['Continuar', 'Encerrar'])
    })
  })

  describe('When the athlete taps "Encerrar"', () => {
    it('Then should call onConfirm once', async () => {
      const onConfirm = vi.fn()
      renderSheet({ onConfirm })

      fireEvent.click(await screen.findByRole('button', { name: 'Encerrar' }))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe.each([
    [
      'taps "Continuar"',
      async () => fireEvent.click(await screen.findByRole('button', { name: 'Continuar' })),
    ],
    [
      'presses Escape',
      async () => fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' }),
    ],
  ])('When the athlete %s', (_name, act) => {
    it('Then should call onContinue', async () => {
      const onContinue = vi.fn()
      renderSheet({ onContinue })

      await act()

      await waitFor(() => expect(onContinue).toHaveBeenCalled())
    })
  })
})
