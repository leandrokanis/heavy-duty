import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomePage from './page'

describe('Given the home page', () => {
  describe('When it renders', () => {
    it('Then should show a heading named Heavy Duty', () => {
      render(<HomePage />)

      expect(screen.getByRole('heading', { name: 'Heavy Duty' })).toBeInTheDocument()
    })
  })
})
