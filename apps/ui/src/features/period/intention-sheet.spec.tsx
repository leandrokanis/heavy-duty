import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IntentionSheet } from './intention-sheet'
import { testPeriod } from './test-period'

function renderSheet(save = vi.fn(), intention: string | null = null) {
  const onSaved = vi.fn()
  render(
    <IntentionSheet open intention={intention} onClose={vi.fn()} onSaved={onSaved} save={save} />,
  )
  return { onSaved, save }
}

describe('Given the intention sheet of a period with no intention', () => {
  describe('When the athlete writes the intention and saves', () => {
    it('Then should send the text and hand back the saved period', async () => {
      const saved = testPeriod({ intention: 'Treinar três vezes por semana.' })
      const { onSaved, save } = renderSheet(
        vi.fn(async () => ({ status: 'ok' as const, period: saved })),
      )

      fireEvent.change(screen.getByRole('textbox', { name: 'Frase de intenção' }), {
        target: { value: 'Treinar três vezes por semana.' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
      expect(save).toHaveBeenCalledWith('Treinar três vezes por semana.')
    })
  })

  describe('When the athlete types', () => {
    it('Then should count the characters out of 120 and stop at 120', () => {
      renderSheet()
      const field = screen.getByRole('textbox', { name: 'Frase de intenção' })

      fireEvent.change(field, { target: { value: 'Treinar' } })

      expect({
        description: field.getAttribute('aria-describedby') !== null,
        counter: screen.getByText('7 de 120 caracteres'),
        maxLength: field.getAttribute('maxlength'),
      }).toMatchObject({ description: true, maxLength: '120' })
    })
  })

  describe('When the athlete saves with no signal', () => {
    it('Then should say the intention was not saved and keep the sheet open', async () => {
      const { onSaved } = renderSheet(vi.fn(async () => ({ status: 'offline' as const })))

      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Sem conexão. A frase não foi salva.',
      )
      expect(onSaved).not.toHaveBeenCalled()
    })
  })
})

describe('Given the intention sheet of a period with an intention', () => {
  describe('When it opens', () => {
    it('Then the field should hold the intention to edit', () => {
      renderSheet(vi.fn(), 'Treinar três vezes por semana.')

      expect(screen.getByRole('textbox', { name: 'Frase de intenção' })).toHaveValue(
        'Treinar três vezes por semana.',
      )
    })
  })
})
