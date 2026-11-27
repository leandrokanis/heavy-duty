import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MedalShelf } from './medal-shelf'
import { HIDDEN, LEVEL_10_IN_CHEST, medal } from './test-medals'

describe('Given the level 10 medal in chest, the first record to conquer and a hidden medal', () => {
  describe('When the shelf is shown', () => {
    const renderShelf = () => {
      render(<MedalShelf medals={[medal({}), LEVEL_10_IN_CHEST, HIDDEN]} />)
      return within(screen.getByRole('list', { name: 'Medalhas' }))
    }

    it('Then it should show the level medal with its group, conquered', () => {
      expect(
        renderShelf().getByRole('listitem', { name: 'Nível 10 · Peito, conquistada' }),
      ).toBeInTheDocument()
    })

    it('Then it should show the first record with its criterion, to conquer', () => {
      const card = renderShelf().getByRole('listitem', {
        name: 'Primeiro recorde, a conquistar',
      })
      expect(card).toHaveTextContent('Registre a primeira série recorde.')
    })

    it('Then the hidden medal should come with no name and no criterion', () => {
      const card = renderShelf().getByRole('listitem', { name: 'Medalha oculta' })
      expect(card).toHaveTextContent(/^\?\?\?$/)
    })
  })
})
