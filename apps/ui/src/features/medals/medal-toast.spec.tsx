import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MedalToast, medalAnnouncementOf } from './medal-toast'
import { LEVEL_10_IN_CHEST, medal } from './test-medals'

describe('Given two medals awarded since the last read', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const first = medal({ awardedAt: '2026-12-03T21:30:00.000Z' })

  describe('When the toast shows', () => {
    it('Then it should show the first medal as new', () => {
      const { container } = render(
        <MedalToast medals={[first, LEVEL_10_IN_CHEST]} onDone={vi.fn()} />,
      )
      expect(container).toHaveTextContent('Primeiro recordeMedalha nova')
    })

    it('Then the announcement should name both medals', () => {
      expect(medalAnnouncementOf([first, LEVEL_10_IN_CHEST])).toBe(
        'Medalha nova: Primeiro recorde. Medalha nova: Nível 10 · Peito',
      )
    })

    it('Then it should show the second medal after the first', () => {
      const { container } = render(
        <MedalToast medals={[first, LEVEL_10_IN_CHEST]} onDone={vi.fn()} />,
      )
      act(() => {
        vi.advanceTimersByTime(2600)
      })
      expect(container).toHaveTextContent('Nível 10 · PeitoMedalha nova')
    })

    it('Then it should call onDone after the last medal', () => {
      const onDone = vi.fn()
      const { container } = render(
        <MedalToast medals={[first, LEVEL_10_IN_CHEST]} onDone={onDone} />,
      )
      for (const _ of [first, LEVEL_10_IN_CHEST]) {
        act(() => {
          vi.advanceTimersByTime(2600)
        })
      }
      expect({
        done: onDone.mock.calls.length,
        text: container.textContent,
      }).toEqual({
        done: 1,
        text: '',
      })
    })
  })
})
