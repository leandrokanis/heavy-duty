import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LastSetButton } from './last-set-button'

describe('Given the last set of supino at 45000 g and 10 reps', () => {
  describe('When the button is on screen', () => {
    it('Then should be named "Corrigir última série: 45 quilos, 10 repetições" and show "45 kg · 10 rep"', () => {
      render(<LastSetButton set={{ loadG: 45000, reps: 10 }} onOpen={vi.fn()} />)
      const button = screen.getByRole('button', {
        name: 'Corrigir última série: 45 quilos, 10 repetições',
      })

      expect(button.textContent).toBe('45 kg · 10 rep')
    })
  })

  describe('When the athlete taps it', () => {
    it('Then should call onOpen once', () => {
      const onOpen = vi.fn()
      render(<LastSetButton set={{ loadG: 45000, reps: 10 }} onOpen={onOpen} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onOpen).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Given the last set of prancha at 0 g and 45 s', () => {
  describe('When the button is on screen', () => {
    it('Then should be named "Corrigir última série: 0 quilos, 45 segundos" and show "0 kg · 45 s"', () => {
      render(<LastSetButton set={{ loadG: 0, seconds: 45 }} onOpen={vi.fn()} />)
      const button = screen.getByRole('button', {
        name: 'Corrigir última série: 0 quilos, 45 segundos',
      })

      expect(button.textContent).toBe('0 kg · 45 s')
    })
  })
})

describe('Given the last set button of the prototype layout', () => {
  describe('When it is on screen', () => {
    it('Then the pencil should be decorative and the text should stay the values alone', () => {
      render(<LastSetButton set={{ loadG: 45000, reps: 10 }} onOpen={vi.fn()} />)
      const button = screen.getByRole('button')

      expect({
        pencil: button.querySelector('svg')?.getAttribute('aria-hidden'),
        text: button.textContent,
      }).toEqual({ pencil: 'true', text: '45 kg · 10 rep' })
    })
  })
})
