import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Lock } from 'lucide-react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from './button'

const touch = { pointerType: 'touch', isPrimary: true, button: 0 }

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

describe('Given a Button', () => {
  beforeEach(() => {
    MotionGlobalConfig.instantAnimations = true
    stubReducedMotion(false)
  })

  afterEach(() => {
    MotionGlobalConfig.instantAnimations = false
  })

  describe('When it has an icon and a label', () => {
    it('Then should name the button by the label and hide the icon from assistive technology', () => {
      render(<Button icon={Lock}>Entrar</Button>)
      const button = screen.getByRole('button', { name: 'Entrar' })

      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('When the finger presses a primary button', () => {
    it('Then should dim it to 0.9 brightness', async () => {
      render(<Button variant="primary">Entrar</Button>)
      const button = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.pointerDown(button, touch)

      await waitFor(() => expect(button.style.filter).toBe('brightness(0.9)'))
    })
  })

  describe('When the finger presses a secondary or destructive button', () => {
    it('Then should keep the brightness and only scale', async () => {
      render(
        <>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="destructive">Encerrar</Button>
        </>,
      )
      const buttons = [
        screen.getByRole('button', { name: 'Cancelar' }),
        screen.getByRole('button', { name: 'Encerrar' }),
      ]

      for (const button of buttons) fireEvent.pointerDown(button, touch)
      await waitFor(() => expect(buttons[0]).toHaveAttribute('data-pressed'))

      expect(buttons.map((button) => [button.style.filter, button.style.transform])).toEqual([
        ['brightness(1)', 'scale(0.97)'],
        ['brightness(1)', 'scale(0.97)'],
      ])
    })
  })

  describe('When reduced motion is on and the finger presses a primary button', () => {
    it('Then should dim it without scaling', async () => {
      stubReducedMotion(true)
      render(<Button variant="primary">Entrar</Button>)
      const button = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.pointerDown(button, touch)
      await waitFor(() => expect(button.style.filter).toBe('brightness(0.9)'))

      expect(button.style.transform).not.toContain('0.97')
    })
  })

  describe('When it is disabled', () => {
    it('Then should ignore the click', () => {
      const onClick = vi.fn()
      render(
        <Button disabled onClick={onClick}>
          Entrar
        </Button>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('When it is disabled but focusable', () => {
    it('Then should keep the focus', () => {
      render(
        <Button disabled focusableWhenDisabled>
          Entrar
        </Button>,
      )
      const button = screen.getByRole('button', { name: 'Entrar' })

      button.focus()

      expect(document.activeElement).toBe(button)
    })
  })
})
