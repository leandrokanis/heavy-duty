import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from './sheet'

function ExampleSheet({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)
  const returnFocusRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button type="button" ref={returnFocusRef}>
        Voltar aqui
      </button>
      <Sheet.Root
        open={open}
        finalFocus={returnFocusRef}
        onOpenChange={(next) => {
          setOpen(next)
          onOpenChange?.(next)
        }}
      >
        <Sheet.Title>Começar o treino</Sheet.Title>
        <Sheet.Body>
          <p>Três exercícios</p>
        </Sheet.Body>
        <Sheet.Actions>
          <button type="button">Cancelar</button>
          <button type="button">Começar</button>
        </Sheet.Actions>
      </Sheet.Root>
    </>
  )
}

describe('Given an open Sheet', () => {
  describe('When it is rendered', () => {
    it('Then should be a dialog named by the Sheet.Title', async () => {
      render(<ExampleSheet />)

      expect(await screen.findByRole('dialog', { name: 'Começar o treino' })).toBeInTheDocument()
    })

    it('Then should keep the handle out of the accessibility tree', async () => {
      render(<ExampleSheet />)
      const dialog = await screen.findByRole('dialog', { name: 'Começar o treino' })

      expect(dialog.querySelector('[data-slot="sheet-handle"]')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
    })

    it('Then should show both actions with the given names', async () => {
      render(<ExampleSheet />)
      const dialog = await screen.findByRole('dialog', { name: 'Começar o treino' })

      expect(
        within(dialog)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['Cancelar', 'Começar'])
    })
  })

  describe('When the user presses Escape', () => {
    it('Then should ask to close', async () => {
      const onOpenChange = vi.fn()
      render(<ExampleSheet onOpenChange={onOpenChange} />)
      const dialog = await screen.findByRole('dialog', { name: 'Começar o treino' })

      fireEvent.keyDown(dialog, { key: 'Escape' })

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    })
  })

  describe('When the user taps the backdrop', () => {
    it('Then should ask to close', async () => {
      const onOpenChange = vi.fn()
      render(<ExampleSheet onOpenChange={onOpenChange} />)
      await screen.findByRole('dialog', { name: 'Começar o treino' })
      const backdrop = document.querySelector('[data-slot="sheet-backdrop"]') as HTMLElement

      fireEvent.pointerDown(backdrop)
      fireEvent.click(backdrop)

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    })
  })

  describe('When the sheet closes', () => {
    it('Then should return the focus to the finalFocus element', async () => {
      render(<ExampleSheet />)
      const dialog = await screen.findByRole('dialog', { name: 'Começar o treino' })

      fireEvent.keyDown(dialog, { key: 'Escape' })

      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Voltar aqui' })),
      )
    })
  })
})

describe('Given an open Sheet with the role alertdialog', () => {
  describe('When it is rendered', () => {
    it('Then should be an alertdialog named by the Sheet.Title', async () => {
      render(
        <Sheet.Root open role="alertdialog" onOpenChange={vi.fn()}>
          <Sheet.Title>Apagar treino</Sheet.Title>
        </Sheet.Root>,
      )

      expect(await screen.findByRole('alertdialog', { name: 'Apagar treino' })).toBeInTheDocument()
    })
  })
})
