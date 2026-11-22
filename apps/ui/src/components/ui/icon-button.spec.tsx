import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChevronDown } from 'lucide-react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IconButton } from './icon-button'

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

describe('Given an IconButton', () => {
  beforeEach(() => {
    MotionGlobalConfig.instantAnimations = true
    stubReducedMotion(false)
  })

  afterEach(() => {
    MotionGlobalConfig.instantAnimations = false
  })

  describe('When it is rendered with an aria-label', () => {
    it('Then should take the name from the label and hide the icon', () => {
      render(<IconButton icon={ChevronDown} aria-label="Abrir a sequência do treino" />)
      const button = screen.getByRole('button', { name: 'Abrir a sequência do treino' })

      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('When the finger presses it', () => {
    it('Then should scale to 0.94 and mark data-pressed', async () => {
      render(<IconButton icon={ChevronDown} aria-label="Abrir" />)
      const button = screen.getByRole('button', { name: 'Abrir' })

      fireEvent.pointerDown(button, touch)
      await waitFor(() => expect(button).toHaveAttribute('data-pressed'))

      expect(button.style.transform).toBe('scale(0.94)')
    })
  })

  describe('When reduced motion is on and the finger presses it', () => {
    it('Then should mark data-pressed without scaling', async () => {
      stubReducedMotion(true)
      render(<IconButton icon={ChevronDown} aria-label="Abrir" />)
      const button = screen.getByRole('button', { name: 'Abrir' })

      fireEvent.pointerDown(button, touch)
      await waitFor(() => expect(button).toHaveAttribute('data-pressed'))

      expect(button.style.transform).not.toContain('0.94')
    })
  })
})
