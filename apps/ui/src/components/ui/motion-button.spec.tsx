import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MotionButton } from './motion-button'

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

describe('Given a MotionButton', () => {
  beforeEach(() => {
    MotionGlobalConfig.instantAnimations = true
  })

  afterEach(() => {
    MotionGlobalConfig.instantAnimations = false
  })

  describe('When the finger presses and releases it', () => {
    it('Then should mark data-pressed and scale to 0.97 while pressed, and clear both on release', async () => {
      stubReducedMotion(false)
      render(<MotionButton>Entrar</MotionButton>)
      const button = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.pointerDown(button, touch)
      await waitFor(() => expect(button).toHaveAttribute('data-pressed'))
      const whilePressed = {
        pressed: button.hasAttribute('data-pressed'),
        transform: button.style.transform,
      }
      fireEvent.pointerUp(button, touch)
      await waitFor(() => expect(button).not.toHaveAttribute('data-pressed'))

      expect({ whilePressed, afterRelease: button.hasAttribute('data-pressed') }).toEqual({
        whilePressed: { pressed: true, transform: 'scale(0.97)' },
        afterRelease: false,
      })
    })
  })

  describe('When reduced motion is on and the finger presses it', () => {
    it('Then should mark data-pressed without scaling', async () => {
      stubReducedMotion(true)
      render(<MotionButton>Entrar</MotionButton>)
      const button = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.pointerDown(button, touch)
      await waitFor(() => expect(button).toHaveAttribute('data-pressed'))

      expect(button.style.transform).not.toContain('0.97')
    })
  })

  describe('When it is disabled and the user clicks it', () => {
    it('Then should not call onClick', () => {
      const onClick = vi.fn()
      render(
        <MotionButton disabled onClick={onClick}>
          Entrar
        </MotionButton>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('When it is disabled but focusable', () => {
    it('Then should take focus and expose aria-disabled', () => {
      render(
        <MotionButton disabled focusableWhenDisabled>
          Entrar
        </MotionButton>,
      )
      const button = screen.getByRole('button', { name: 'Entrar' })

      button.focus()

      expect({
        focused: document.activeElement === button,
        ariaDisabled: button.getAttribute('aria-disabled'),
      }).toEqual({
        focused: true,
        ariaDisabled: 'true',
      })
    })
  })
})
