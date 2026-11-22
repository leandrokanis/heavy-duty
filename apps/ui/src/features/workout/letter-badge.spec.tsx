import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LetterBadge } from './letter-badge'

describe('Given a LetterBadge', () => {
  describe('When it shows a letter', () => {
    it('Then should hold the letter as text, so it joins the name of the button around it', () => {
      render(
        <button type="button">
          <LetterBadge letter="A" size={44} />
        </button>,
      )

      expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    })
  })

  describe('When it is suggested', () => {
    it('Then should carry data-suggested', () => {
      render(<LetterBadge letter="A" size={44} suggested />)

      expect(screen.getByText('A')).toHaveAttribute('data-suggested')
    })

    it('Then should not carry data-suggested otherwise', () => {
      render(<LetterBadge letter="B" size={30} />)

      expect(screen.getByText('B')).not.toHaveAttribute('data-suggested')
    })
  })
})
