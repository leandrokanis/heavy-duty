import { render, screen } from '@testing-library/react'
import { History } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { IconLink } from './icon-link'

describe('Given an IconLink', () => {
  describe('When it is rendered with an href and an aria-label', () => {
    it('Then should be a link named by the label to the href', () => {
      render(<IconLink href="/historico" icon={History} aria-label="Histórico" />)

      expect(screen.getByRole('link', { name: 'Histórico' })).toHaveAttribute('href', '/historico')
    })

    it('Then should keep the icon out of the accessibility tree', () => {
      render(<IconLink href="/historico" icon={History} aria-label="Histórico" />)

      expect(screen.getByRole('link').querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })

    it('Then should have the 44 px touch area', () => {
      render(<IconLink href="/historico" icon={History} aria-label="Histórico" />)

      expect(screen.getByRole('link')).toHaveClass('size-(--target-min)')
    })
  })
})
