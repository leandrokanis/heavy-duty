import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteWorkoutSheet } from './delete-workout-sheet'

type Props = Partial<Parameters<typeof DeleteWorkoutSheet>[0]>

function renderSheet(props: Props = {}) {
  render(
    <DeleteWorkoutSheet
      open
      title="Letra A · sáb., 21 de nov."
      setCount={3}
      busy={false}
      failed={false}
      returnFocusRef={{ current: null }}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  )
}

describe('Given the delete sheet of a workout with 3 sets', () => {
  describe('When the sheet renders', () => {
    it('Then should be an alertdialog named "Apagar treino" with the workout, its sets, Cancelar and Apagar', async () => {
      renderSheet()

      const dialog = await screen.findByRole('alertdialog', { name: 'Apagar treino' })
      expect({
        workout: within(dialog).getByText('Letra A · sáb., 21 de nov.').textContent,
        sets: within(dialog).getByText(/séries/).textContent,
        buttons: within(dialog)
          .getAllByRole('button')
          .map((button) => button.textContent),
      }).toEqual({
        workout: 'Letra A · sáb., 21 de nov.',
        sets: '3 séries saem do histórico',
        buttons: ['Cancelar', 'Apagar'],
      })
    })
  })

  describe('When the athlete taps Apagar', () => {
    it('Then should call onConfirm once and not onCancel', async () => {
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      renderSheet({ onConfirm, onCancel })

      fireEvent.click(await screen.findByRole('button', { name: 'Apagar' }))

      expect([onConfirm.mock.calls.length, onCancel.mock.calls.length]).toEqual([1, 0])
    })
  })

  describe('When the athlete presses Escape', () => {
    it('Then should call onCancel and not onConfirm', async () => {
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      renderSheet({ onConfirm, onCancel })

      fireEvent.keyDown(await screen.findByRole('alertdialog'), { key: 'Escape' })

      await waitFor(() => expect(onCancel).toHaveBeenCalled())
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })
})

describe('Given the delete sheet while the removal is in progress', () => {
  describe('When the athlete taps Apagar again', () => {
    it('Then Apagar should be disabled and onConfirm should not be called', async () => {
      const onConfirm = vi.fn()
      renderSheet({ busy: true, onConfirm })

      const button = await screen.findByRole('button', { name: 'Apagar' })
      fireEvent.click(button)

      expect({
        disabled: button.getAttribute('aria-disabled'),
        calls: onConfirm.mock.calls.length,
      }).toEqual({ disabled: 'true', calls: 0 })
    })
  })
})

describe('Given the delete sheet after a removal that failed', () => {
  describe('When the sheet renders', () => {
    it('Then should read "Sem conexão. Tente de novo." in an alert', async () => {
      renderSheet({ failed: true })

      const dialog = await screen.findByRole('alertdialog')
      expect(within(dialog).getByRole('alert').textContent).toBe('Sem conexão. Tente de novo.')
    })
  })
})
