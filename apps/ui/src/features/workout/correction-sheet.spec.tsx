import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CorrectionSheet } from './correction-sheet'

const SUPINO_SET = { setNumber: 1, loadG: 45000, reps: 10 }
const PRANCHA_SET = { setNumber: 1, loadG: 0, seconds: 45 }

type Handlers = { onCancel?: () => void; onSave?: (values: unknown) => void }

function renderSupino({ onCancel = vi.fn(), onSave = vi.fn() }: Handlers = {}) {
  render(
    <CorrectionSheet
      open
      exerciseName="Supino reto"
      kind="reps"
      set={SUPINO_SET}
      returnFocusRef={{ current: null }}
      onCancel={onCancel}
      onSave={onSave}
    />,
  )
  return { onCancel, onSave }
}

describe('Given the correction sheet open on set 1 of supino at 45000 g and 10 reps', () => {
  describe('When it is on screen', () => {
    it('Then should have the title, the exercise and set, the two wheels and the two buttons', () => {
      renderSupino()

      expect({
        title: screen.getByRole('heading', { name: 'Corrigir última série' }).textContent,
        subtitle: screen.getByText('Supino reto · série 1').textContent,
        load: screen.getByRole('spinbutton', { name: 'Carga' }).getAttribute('aria-valuenow'),
        reps: screen.getByRole('spinbutton', { name: 'Repetições' }).getAttribute('aria-valuenow'),
        buttons: ['Cancelar', 'Salvar'].map(
          (name) => screen.getByRole('button', { name }).textContent,
        ),
        textboxes: screen.queryAllByRole('textbox').length,
      }).toEqual({
        title: 'Corrigir última série',
        subtitle: 'Supino reto · série 1',
        load: '45',
        reps: '10',
        buttons: ['Cancelar', 'Salvar'],
        textboxes: 0,
      })
    })
  })

  describe('When the athlete taps "Diminuir carga"', () => {
    it('Then should show 42,5 and call nothing', () => {
      const { onCancel, onSave } = renderSupino()

      fireEvent.click(screen.getByRole('button', { name: 'Diminuir carga' }))

      expect({
        load: screen.getByRole('spinbutton', { name: 'Carga' }).getAttribute('aria-valuetext'),
        calls: [onCancel, onSave].map((fn) => vi.mocked(fn).mock.calls.length),
      }).toEqual({ load: '42,5 quilos', calls: [0, 0] })
    })
  })

  describe('When the athlete lowers the load one step and taps "Salvar"', () => {
    it('Then should call onSave with 42500 g and 10 reps', () => {
      const { onSave } = renderSupino()

      fireEvent.click(screen.getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(onSave).toHaveBeenCalledWith({ loadG: 42500, reps: 10, seconds: null })
    })
  })

  describe('When the athlete lowers the load and taps "Cancelar"', () => {
    it('Then should call onCancel and never onSave', () => {
      const { onCancel, onSave } = renderSupino()

      fireEvent.click(screen.getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect([onCancel, onSave].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([1, 0])
    })
  })
})

function Reopenable() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reabrir
      </button>
      <CorrectionSheet
        open={open}
        exerciseName="Supino reto"
        kind="reps"
        set={SUPINO_SET}
        returnFocusRef={{ current: null }}
        onCancel={() => setOpen(false)}
        onSave={() => setOpen(false)}
      />
    </>
  )
}

describe('Given the sheet cancelled after lowering the load', () => {
  describe('When it opens again', () => {
    it('Then should show 45 again', async () => {
      render(<Reopenable />)
      fireEvent.click(screen.getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      await vi.waitFor(() => expect(screen.queryByRole('spinbutton', { name: 'Carga' })).toBeNull())

      fireEvent.click(screen.getByRole('button', { name: 'Reabrir', hidden: true }))

      expect(
        (await screen.findByRole('spinbutton', { name: 'Carga' })).getAttribute('aria-valuenow'),
      ).toBe('45')
    })
  })
})

describe('Given the sheet open with a load of 0 g', () => {
  describe('When it is on screen', () => {
    it('Then "Diminuir carga" should be aria-disabled', () => {
      render(
        <CorrectionSheet
          open
          exerciseName="Prancha"
          kind="time"
          set={PRANCHA_SET}
          returnFocusRef={{ current: null }}
          onCancel={vi.fn()}
          onSave={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Diminuir carga' }).getAttribute('aria-disabled'),
      ).toBe('true')
    })
  })
})

describe('Given the correction sheet open on set 1 of prancha at 45 s', () => {
  describe('When it is on screen', () => {
    it('Then should show the Tempo wheel at 45 and no Repetições wheel', () => {
      render(
        <CorrectionSheet
          open
          exerciseName="Prancha"
          kind="time"
          set={PRANCHA_SET}
          returnFocusRef={{ current: null }}
          onCancel={vi.fn()}
          onSave={vi.fn()}
        />,
      )

      expect({
        time: screen.getByRole('spinbutton', { name: 'Tempo' }).getAttribute('aria-valuenow'),
        reps: screen.queryByRole('spinbutton', { name: 'Repetições' }),
      }).toEqual({ time: '45', reps: null })
    })
  })
})
