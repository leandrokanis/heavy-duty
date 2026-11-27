import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SnapshotList } from './snapshot-list'
import { frozenPeriod } from './test-snapshot'

const SAO_PAULO = 'America/Sao_Paulo'

describe('Given two ended periods and the current one (US-F11-02)', () => {
  const periods = [
    frozenPeriod({ number: 3, frozenAt: null, snapshot: null }),
    frozenPeriod({
      number: 2,
      startsAt: '2027-02-15T03:00:00.000Z',
      endsAt: '2027-05-10T03:00:00.000Z',
      intention: null,
    }),
    frozenPeriod(),
  ]

  describe('When the list renders', () => {
    it('Then should show one snapshot per ended period, the most recent first', () => {
      render(<SnapshotList periods={periods} timeZone={SAO_PAULO} />)

      const list = screen.getByRole('list', { name: 'Retratos' })
      expect(
        within(list)
          .getAllByRole('heading', { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(['Período 2', 'Período 1'])
    })

    it('Then the snapshot of period 1 should show its days, its intention and its numbers', () => {
      render(<SnapshotList periods={periods} timeZone={SAO_PAULO} />)

      const card = screen.getByRole('article', { name: 'Período 1' })
      expect([
        within(card).getByText('De 23 de nov. a 14 de fev.'),
        within(card).getByText('“Treinar três vezes por semana até o fim do ano.”'),
        within(card).getByText('72 % das janelas'),
        within(card).getByText('3120 pontos'),
        within(card).getByText('5 semanas seguidas'),
      ]).toHaveLength(5)
    })

    it('Then the snapshot should list the level of each group at the end', () => {
      render(<SnapshotList periods={periods} timeZone={SAO_PAULO} />)

      const levels = within(screen.getByRole('article', { name: 'Período 1' })).getByRole('list', {
        name: 'Níveis no fim do período 1',
      })
      expect(
        within(levels)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Peito12', 'Costas6'])
    })

    it('Then the snapshot with no intention should say so', () => {
      render(<SnapshotList periods={periods} timeZone={SAO_PAULO} />)

      expect(
        within(screen.getByRole('article', { name: 'Período 2' })).getByText(
          'Sem frase de intenção',
        ),
      ).toBeInTheDocument()
    })
  })
})

describe('Given only the current period', () => {
  describe('When the list renders', () => {
    it('Then should say that the snapshot comes at the end of week 12', () => {
      render(<SnapshotList periods={[frozenPeriod({ frozenAt: null, snapshot: null })]} />)

      expect([
        screen.getByText('Nenhum retrato ainda'),
        screen.getByText('O retrato do período aparece no fim da semana 12.'),
      ]).toHaveLength(2)
    })
  })
})
