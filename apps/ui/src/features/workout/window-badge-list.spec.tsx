import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WindowBadgeList } from './window-badge-list'
import type { WindowBadge } from './window-badges'

const SAO_PAULO = 'America/Sao_Paulo'
// Monday 2026-11-23, 09:00 in Sao Paulo.
const NOW_MS = Date.parse('2026-11-23T12:00:00.000Z')

function badge(state: WindowBadge['state'], atIso: string, name = 'peito'): WindowBadge {
  return { slug: name, name, state, atMs: Date.parse(atIso) }
}

function renderBadges(badges: WindowBadge[]) {
  render(
    <button type="button">
      <WindowBadgeList badges={badges} nowMs={NOW_MS} timeZone={SAO_PAULO} />
    </button>,
  )
}

describe('Given an open, a resting and a cooling badge', () => {
  describe('When they are rendered', () => {
    it('Then each should read as one phrase with the group, the verb and the time', () => {
      renderBadges([
        badge('open', '2026-11-26T23:00:00.000Z', 'costas'),
        badge('resting', '2026-11-24T12:00:00.000Z', 'peito'),
        badge('cooling', '2026-11-21T12:00:00.000Z', 'quadríceps'),
      ])

      expect(
        within(screen.getByRole('list'))
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual([
        'Costas · fecha qui 20h',
        'Peito · abre amanhã 9h',
        'Quadríceps · esfriando há 2 dias',
      ])
    })

    it('Then the button around should be named by the phrase alone, without the indicator', () => {
      renderBadges([badge('open', '2026-11-26T23:00:00.000Z')])

      expect(screen.getByRole('button', { name: 'Peito · fecha qui 20h' })).toBeInTheDocument()
    })
  })

  describe('When a cooling badge is rendered', () => {
    it('Then its indicator should carry the hatch marker, and the others should not', () => {
      renderBadges([
        badge('cooling', '2026-11-21T12:00:00.000Z', 'quadríceps'),
        badge('open', '2026-11-26T23:00:00.000Z', 'costas'),
      ])

      const [cooling, open] = screen.getAllByRole('listitem')

      expect({
        cooling: cooling?.querySelector('[data-hatched]') !== null,
        open: open?.querySelector('[data-hatched]') !== null,
      }).toEqual({ cooling: true, open: false })
    })
  })

  describe('When there are no badges', () => {
    it('Then should render nothing', () => {
      renderBadges([])

      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })
})
