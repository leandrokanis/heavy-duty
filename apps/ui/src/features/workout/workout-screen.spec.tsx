import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRANCHA, SUPINO_RETO, todayDay } from './test-today'
import { WorkoutScreen } from './workout-screen'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const STARTED_AT = '2026-11-21T18:30:00.000Z'

function renderWorkout() {
  return render(
    <WorkoutScreen
      workoutId={WORKOUT_ID}
      startedAt={STARTED_AT}
      programId="program-1"
      day={todayDay('A', 'Superior', [SUPINO_RETO, PRANCHA])}
    />,
  )
}

function stubFetch(...responses: (Response | Error | 'pending')[]) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    fetchMock.mockImplementationOnce(async () => {
      if (response === 'pending') return new Promise<Response>(() => {})
      if (response instanceof Error) throw response
      return response
    })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function created() {
  return new Response(JSON.stringify({}), { status: 201 })
}

function sentBodies(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown>[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string))
}

function tapNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given supino-reto with 42,5 kg from the last workout and 10 reps', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then should send set 1 with 42500 g, 10 reps and the workout of the session, with no text field on screen', async () => {
      const fetchMock = stubFetch(created())
      renderWorkout()

      await act(async () => tapNext())

      expect({
        url: fetchMock.mock.calls[0]?.[0],
        body: sentBodies(fetchMock)[0],
        textboxes: screen.queryAllByRole('textbox').length,
      }).toEqual({
        url: `/api/workouts/${WORKOUT_ID}/sets`,
        body: expect.objectContaining({
          workout: { programId: 'program-1', letter: 'A', startedAt: STARTED_AT },
          plannedExerciseId: 'planned-supino',
          exerciseId: 'exercise-supino',
          setNumber: 1,
          loadG: 42500,
          reps: 10,
        }),
        textboxes: 0,
      })
    })
  })
})

const T0 = Date.UTC(2026, 10, 21, 18, 31, 5)

function restClock() {
  return screen.getByRole('timer', { name: 'Descanso' }).textContent
}

function recordedDots() {
  return screen
    .getByRole('progressbar', { name: 'Séries' })
    .querySelectorAll('[data-recorded="true"]').length
}

describe('Given the API does not answer', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the rest should start at 1:30 at once, read 1:29 after 1 s and stop at 0:00, with set 1 marked recorded and Próximo aria-disabled', () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      renderWorkout()
      const before = recordedDots()

      act(() => tapNext())
      const atTap = restClock()
      act(() => vi.advanceTimersByTime(1000))
      const afterOneSecond = restClock()
      act(() => vi.advanceTimersByTime(95_000))

      expect({
        before,
        atTap,
        afterOneSecond,
        afterTheRest: restClock(),
        recordedDots: recordedDots(),
        nextDisabled: screen.getByRole('button', { name: 'Próximo' }).getAttribute('aria-disabled'),
      }).toEqual({
        before: 0,
        atTap: '1:30',
        afterOneSecond: '1:29',
        afterTheRest: '0:00',
        recordedDots: 1,
        nextDisabled: 'true',
      })
    })
  })
})

describe('Given the workout screen on set 1 of supino-reto', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the polite live region, mounted and empty before, should announce Série 1 de 3 registrada', async () => {
      stubFetch(created())
      renderWorkout()
      const region = screen.getByRole('status')
      const before = { live: region.getAttribute('aria-live'), text: region.textContent }

      await act(async () => tapNext())

      expect({ before, after: screen.getByRole('status').textContent }).toEqual({
        before: { live: 'polite', text: '' },
        after: 'Série 1 de 3 registrada',
      })
    })
  })
})

describe('Given the workout screen on set 1 of supino-reto, for a double tap', () => {
  describe('When the athlete taps Próximo twice with 300 ms between the taps', () => {
    it('Then should send one set only and keep the rest at 1:30', () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      renderWorkout()

      act(() => tapNext())
      act(() => vi.advanceTimersByTime(300))
      act(() => tapNext())

      expect({ posts: fetchMock.mock.calls.length, rest: restClock() }).toEqual({
        posts: 1,
        rest: '1:30',
      })
    })
  })
})

describe('Given the network fails on the first send', () => {
  describe('When the athlete taps Próximo and then Reenviar, with the API answering 201', () => {
    it('Then the rest should start with Série não enviada and Reenviar, and the resend should carry the same body and clear the notice', async () => {
      const fetchMock = stubFetch(new TypeError('Failed to fetch'), created())
      renderWorkout()

      await act(async () => tapNext())
      const afterFailure = {
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        notice: screen.queryByText('Série não enviada') !== null,
      }
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reenviar' })))
      const [first, second] = sentBodies(fetchMock)

      expect({
        afterFailure,
        sameBody: second !== undefined && JSON.stringify(second) === JSON.stringify(first),
        noticeAfterResend: screen.queryByText('Série não enviada'),
      }).toEqual({
        afterFailure: { resting: true, notice: true },
        sameBody: true,
        noticeAfterResend: null,
      })
    })
  })
})

describe('Given the API answers 401 to the send', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the workout screen should stay and show Série não enviada', async () => {
      stubFetch(new Response(JSON.stringify({ code: 'unauthenticated' }), { status: 401 }))
      renderWorkout()

      await act(async () => tapNext())

      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        notice: screen.queryByText('Série não enviada') !== null,
        resend: screen.queryByRole('button', { name: 'Reenviar' }) !== null,
      }).toEqual({ title: 'Supino reto', notice: true, resend: true })
    })
  })
})
