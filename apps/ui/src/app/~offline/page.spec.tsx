import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OfflinePage from './page'

describe('Given the offline page', () => {
  describe('When it renders', () => {
    it('Then should show the offline heading and a retry button', () => {
      render(<OfflinePage />)

      expect([
        screen.getByRole('heading', { name: 'Sem conexão' }),
        screen.getByRole('button', { name: 'Tentar de novo' }),
      ]).toHaveLength(2)
    })
  })
  describe('When the retry button is pressed', () => {
    it('Then should reload the page', () => {
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      render(<OfflinePage />)

      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

      expect(reload).toHaveBeenCalledOnce()
    })
  })
  describe('When the athlete taps Voltar ao treino do dia', () => {
    it('Then should open the workout of the day', () => {
      const assign = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign })
      render(<OfflinePage />)

      fireEvent.click(screen.getByRole('button', { name: 'Voltar ao treino do dia' }))

      expect(assign).toHaveBeenCalledWith('/')
    })
  })
  describe('When the icon is looked up', () => {
    it('Then should keep the WifiOff icon out of the accessibility tree', () => {
      const { container } = render(<OfflinePage />)

      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
