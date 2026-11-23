import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LetterList } from './letter-list'
import { CRUCIFIXO, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'
import type { ActivityWindows } from './windows.types'

// Monday 2026-11-23, 09:00 in Sao Paulo.
const NOW_MS = Date.parse('2026-11-23T12:00:00.000Z')

const WINDOWS: ActivityWindows = {
  now: '2026-11-23T12:00:00.000Z',
  groups: [
    {
      muscleGroup: { slug: 'chest', name: 'peito' },
      state: 'open',
      lastTrainedAt: '2026-11-21T10:00:00.000Z',
      opensAt: '2026-11-22T09:00:00.000Z',
      closesAt: '2026-11-26T23:00:00.000Z',
    },
    {
      muscleGroup: { slug: 'triceps', name: 'tríceps' },
      state: 'resting',
      lastTrainedAt: '2026-11-23T11:00:00.000Z',
      opensAt: '2026-11-24T12:00:00.000Z',
      closesAt: '2026-11-27T12:00:00.000Z',
    },
  ],
}

const DAYS = [
  todayDay('A', 'Superior', [SUPINO_RETO, TRICEPS_POLIA, CRUCIFIXO]),
  todayDay('B', 'Core', [PRANCHA]),
]

function renderList(windows: ActivityWindows | null) {
  render(
    <LetterList
      days={DAYS}
      suggestedLetter="A"
      onSelect={vi.fn()}
      windows={windows}
      nowMs={NOW_MS}
      timeZone="America/Sao_Paulo"
    />,
  )
}

describe('Given letter A trains chest and triceps and letter B trains only abs, which has no window', () => {
  describe('When the list is rendered with the windows', () => {
    it('Then letter A should show chest and triceps, and letter B should show no window', () => {
      renderList(WINDOWS)

      const [a, b] = screen.getAllByRole('button')

      expect({ a: a?.textContent, b: b?.textContent }).toEqual({
        a: 'ASuperiorPeito · fecha qui 20hTríceps · abre amanhã 9hSugerida',
        b: 'BCore',
      })
    })
  })

  describe('When the list is rendered before the windows arrive', () => {
    it('Then no letter should show a window', () => {
      renderList(null)

      expect(
        screen.getAllByRole('button').flatMap((row) => within(row).queryAllByRole('list')),
      ).toEqual([])
    })
  })
})
