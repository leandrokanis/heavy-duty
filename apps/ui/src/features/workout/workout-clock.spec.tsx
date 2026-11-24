import { act, render, screen } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkoutClock } from './workout-clock'

const STARTED_MS = Date.UTC(2026, 10, 21, 18, 30, 0)

afterEach(() => {
  vi.useRealTimers()
})

function clockText() {
  return screen.getByRole('timer', { name: 'Tempo total' }).textContent
}

describe('Given a workout started 9 min 5 s ago', () => {
  describe('When the clock renders and 2 s pass', () => {
    it('Then should read "9:05" and then "9:07"', async () => {
      vi.useFakeTimers({ now: STARTED_MS + 545_000 })
      render(<WorkoutClock startedAtMs={STARTED_MS} endedAtMs={null} />)
      const first = clockText()

      await act(async () => vi.advanceTimersByTime(2000))

      expect([first, clockText()]).toEqual(['9:05', '9:07'])
    })
  })
})

describe('Given a workout started 59 min 59 s ago', () => {
  describe('When one more second passes', () => {
    it('Then should read "1:00:00"', async () => {
      vi.useFakeTimers({ now: STARTED_MS + 3_599_000 })
      render(<WorkoutClock startedAtMs={STARTED_MS} endedAtMs={null} />)

      await act(async () => vi.advanceTimersByTime(1000))

      expect(clockText()).toBe('1:00:00')
    })
  })
})

describe('Given a workout that ended 52 min after the start', () => {
  describe('When the clock renders and 10 s pass', () => {
    it('Then should stay at "52:00"', async () => {
      vi.useFakeTimers({ now: STARTED_MS + 4_000_000 })
      render(<WorkoutClock startedAtMs={STARTED_MS} endedAtMs={STARTED_MS + 3_120_000} />)

      await act(async () => vi.advanceTimersByTime(10_000))

      expect(clockText()).toBe('52:00')
    })
  })
})

describe('Given a running clock', () => {
  describe('When 3 s pass in ticks of 250 ms', () => {
    it('Then should render once per second shown, not on every tick', async () => {
      vi.useFakeTimers({ now: STARTED_MS })
      const renders = vi.fn()
      render(
        <Profiler id="clock" onRender={renders}>
          <WorkoutClock startedAtMs={STARTED_MS} endedAtMs={null} />
        </Profiler>,
      )
      renders.mockClear()

      for (let tick = 0; tick < 12; tick += 1) {
        await act(async () => vi.advanceTimersByTime(250))
      }

      expect(renders).toHaveBeenCalledTimes(3)
    })
  })
})
