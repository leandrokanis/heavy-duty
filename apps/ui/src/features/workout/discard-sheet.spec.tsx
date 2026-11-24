import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DiscardSheet } from './discard-sheet'

function renderSheet(doneSets: number, { onConfirm = vi.fn(), onContinue = vi.fn() } = {}) {
  render(
    <DiscardSheet
      open
      doneSets={doneSets}
      returnFocusRef={{ current: null }}
      onConfirm={onConfirm}
      onContinue={onContinue}
    />,
  )
}

describe('Given the discard sheet of a workout with 3 sets done', () => {
  describe('When the sheet renders', () => {
    it('Then should be a dialog named "Descartar o treino" saying the 3 sets leave, with Continuar and Descartar', async () => {
      renderSheet(3)

      const dialog = await screen.findByRole('dialog', { name: 'Descartar o treino' })
      expect({
        text: within(dialog).getByText(/séries feitas/).textContent,
        buttons: within(dialog)
          .getAllByRole('button')
          .map((button) => button.textContent),
      }).toEqual({
        text: '3 séries feitas saem do histórico',
        buttons: ['Continuar', 'Descartar'],
      })
    })
  })

  describe('When the athlete taps "Descartar"', () => {
    it('Then should call onConfirm once and not onContinue', async () => {
      const onConfirm = vi.fn()
      const onContinue = vi.fn()
      renderSheet(3, { onConfirm, onContinue })

      fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }))

      expect({ confirm: onConfirm.mock.calls.length, keep: onContinue.mock.calls.length }).toEqual({
        confirm: 1,
        keep: 0,
      })
    })
  })

  describe('When the athlete presses Escape', () => {
    it('Then should call onContinue and not onConfirm', async () => {
      const onConfirm = vi.fn()
      const onContinue = vi.fn()
      renderSheet(3, { onConfirm, onContinue })

      fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' })

      await waitFor(() => expect(onContinue).toHaveBeenCalled())
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })
})

describe.each([
  { doneSets: 1, text: '1 série feita sai do histórico' },
  { doneSets: 0, text: 'Nenhuma série feita' },
])('Given the discard sheet of a workout with $doneSets sets done', ({ doneSets, text }) => {
  describe('When the sheet renders', () => {
    it(`Then should read "${text}"`, async () => {
      renderSheet(doneSets)

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText(text).textContent).toBe(text)
    })
  })
})
