import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TabBar } from './tab-bar'

describe('Given the tab bar on the map', () => {
  describe('When it is rendered', () => {
    it('Then should link the three sections in order', () => {
      render(<TabBar current="map" />)

      const links = within(screen.getByRole('navigation', { name: 'Seções' })).getAllByRole('link')

      expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Treino', '/'],
        ['Mapa', '/mapa'],
        ['Período', '/periodo'],
      ])
    })

    it('Then only the map should be the current page', () => {
      render(<TabBar current="map" />)

      expect(screen.getAllByRole('link').map((link) => link.getAttribute('aria-current'))).toEqual([
        null,
        'page',
        null,
      ])
    })

    it('Then each tab should have the 44 px touch area', () => {
      render(<TabBar current="map" />)

      for (const link of screen.getAllByRole('link')) {
        expect(link).toHaveClass('min-h-(--target-min)')
      }
    })
  })
})
