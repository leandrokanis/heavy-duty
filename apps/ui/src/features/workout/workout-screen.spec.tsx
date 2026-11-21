import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'
import { WorkoutScreen } from './workout-screen'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const STARTED_AT = '2026-11-21T18:30:00.000Z'

function renderWorkout(exercises = [SUPINO_RETO, PRANCHA], onFinish = vi.fn()) {
  return render(
    <WorkoutScreen
      workoutId={WORKOUT_ID}
      startedAt={STARTED_AT}
      programId="program-1"
      day={todayDay('A', 'Superior', exercises)}
      onFinish={onFinish}
    />,
  )
}

// Letter 'A' of the spec: supino-reto 3 x 10 at 42,5 kg resting 90 s, then triceps-polia 3 x 12.
const LETTER_A = [SUPINO_RETO, TRICEPS_POLIA]

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

function buttonState(name: string) {
  const button = screen.getByRole('button', { name })
  return button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true'
    ? 'disabled'
    : 'enabled'
}

function tapNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'wakeLock')
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
    it('Then the rest should start at 1:30 at once, read 1:29 after 1 s and 0:01 after 89 s, with set 1 marked recorded and Próximo enabled', () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      renderWorkout()
      const before = recordedDots()

      act(() => tapNext())
      const atTap = restClock()
      act(() => vi.advanceTimersByTime(1000))
      const afterOneSecond = restClock()
      act(() => vi.advanceTimersByTime(88_000))

      expect({
        before,
        atTap,
        afterOneSecond,
        lastSecond: restClock(),
        recordedDots: recordedDots(),
        next: buttonState('Próximo'),
      }).toEqual({
        before: 0,
        atTap: '1:30',
        afterOneSecond: '1:29',
        lastSecond: '0:01',
        recordedDots: 1,
        next: 'enabled',
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

function valueTextOf(name: string) {
  return screen.getByRole('progressbar', { name }).getAttribute('aria-valuetext')
}

describe('Given supino-reto at 42,5 kg for 10 reps, resting 90 s', () => {
  describe('When the athlete taps Próximo and 90 s go by', () => {
    it('Then set 2 should be ready with 42,5 kg and 10 rep, and the next tap should send set 2', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      renderWorkout(LETTER_A)

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(90_000))
      const ready = {
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
        sets: valueTextOf('Séries'),
      }
      await act(async () => vi.advanceTimersByTime(800))
      await act(async () => tapNext())

      expect({ ready, sent: sentBodies(fetchMock).map(({ setNumber }) => setNumber) }).toEqual({
        ready: { resting: false, load: '42,5kg', target: '10rep', sets: '2 de 3' },
        sent: [1, 2],
      })
    })
  })
})

describe('Given the rest of set 1 of supino-reto running when the screen goes dark', () => {
  describe('When the clock jumps past the end of the rest and a single 250 ms tick runs', () => {
    it('Then set 2 should be ready at once', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout(LETTER_A)
      await act(async () => tapNext())

      vi.setSystemTime(T0 + 300_000)
      await act(async () => vi.advanceTimersByTime(250))

      expect({
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        sets: valueTextOf('Séries'),
      }).toEqual({ resting: false, sets: '2 de 3' })
    })
  })
})

describe('Given the rest of set 1 of supino-reto running', () => {
  describe('When the athlete waits 1 s and taps Próximo again', () => {
    it('Then Próximo should be enabled during the rest, and set 2 should show at once with one set sent', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      renderWorkout(LETTER_A)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
      const duringRest = buttonState('Próximo')

      await act(async () => tapNext())

      expect({
        duringRest,
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        sets: valueTextOf('Séries'),
        posts: fetchMock.mock.calls.length,
      }).toEqual({ duringRest: 'enabled', resting: false, sets: '2 de 3', posts: 1 })
    })
  })
})

describe('Given the rest of set 1 of supino-reto running, for a double tap', () => {
  describe('When the athlete taps Próximo twice with 300 ms between the taps', () => {
    it('Then the rest should be skipped and set 2 should stay ready, with one set sent', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      renderWorkout(LETTER_A)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(300))
      await act(async () => tapNext())

      expect({
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        sets: valueTextOf('Séries'),
        posts: fetchMock.mock.calls.length,
      }).toEqual({ resting: false, sets: '2 de 3', posts: 1 })
    })
  })
})

describe('Given the 90 s rest of set 1 of supino-reto', () => {
  describe('When 30 s go by', () => {
    it('Then the timer should read 1:00 beside a ring with two thirds left to run', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      renderWorkout(LETTER_A)
      await act(async () => tapNext())

      await act(async () => vi.advanceTimersByTime(30_000))
      const ring = screen.getByRole('progressbar', { name: 'Descanso restante' })
      const timer = screen.getByRole('timer', { name: 'Descanso' })
      const stroke = ring.querySelector('circle[stroke-dashoffset]')

      expect({
        timer: timer.textContent,
        tabular: timer.className.includes('tabular-nums'),
        timerInsideRing: ring.contains(timer),
        valueNow: ring.getAttribute('aria-valuenow'),
        valueMax: ring.getAttribute('aria-valuemax'),
        valueText: ring.getAttribute('aria-valuetext'),
        drawnOffset:
          Number(stroke?.getAttribute('stroke-dashoffset')) /
          Number(stroke?.getAttribute('stroke-dasharray')),
      }).toEqual({
        timer: '1:00',
        tabular: true,
        timerInsideRing: false,
        valueNow: '60',
        valueMax: '90',
        valueText: '1:00',
        drawnOffset: expect.closeTo(1 / 3, 5),
      })
    })
  })
})

function setAreaCue() {
  return screen
    .getByRole('group', { name: 'Carga' })
    .closest('[data-cue]')
    ?.getAttribute('data-cue')
}

describe('Given the workout screen just opened on set 1 of supino-reto', () => {
  describe('When the 90 s rest of set 1 ends', () => {
    it('Then the polite live region should announce Série 2 de 3 and the set area should carry the rest-end cue, absent on opening', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout(LETTER_A)
      const cueOnOpening = setAreaCue() ?? null

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(90_000))

      expect({
        cueOnOpening,
        live: screen.getByRole('status').getAttribute('aria-live'),
        announcement: screen.getByRole('status').textContent,
        cue: setAreaCue(),
      }).toEqual({
        cueOnOpening: null,
        live: 'polite',
        announcement: 'Série 2 de 3',
        cue: 'rest-end',
      })
    })
  })
})

// Records sets 1 to 3 of supino-reto, skipping the rests, 1 s between taps.
async function recordSupinoSet3() {
  for (let tap = 0; tap < 5; tap += 1) {
    await act(async () => tapNext())
    await act(async () => vi.advanceTimersByTime(1000))
  }
}

describe('Given sets 1 and 2 of supino-reto recorded, with triceps-polia after it', () => {
  describe('When the athlete records set 3 and its 90 s rest ends', () => {
    it('Then the rest should show A seguir with triceps-polia, and then triceps-polia should be ready with 20 kg and 12 rep', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created(), created(), created())
      renderWorkout(LETTER_A)

      await recordSupinoSet3()
      const duringRest = {
        title: screen.getByRole('heading', { level: 1 }).textContent,
        upNext: screen.queryByText('A seguir') !== null,
        upNextName: screen.queryByText('Tríceps na polia') !== null,
      }
      await act(async () => vi.advanceTimersByTime(89_000))

      expect({
        duringRest,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
        sets: valueTextOf('Séries'),
        exercises: valueTextOf('Exercícios'),
        announcement: screen.getByRole('status').textContent,
      }).toEqual({
        duringRest: { title: 'Supino reto', upNext: true, upNextName: true },
        title: 'Tríceps na polia',
        load: '20kg',
        target: '12rep',
        sets: '1 de 3',
        exercises: '2 de 2',
        announcement: 'Tríceps na polia, série 1 de 3',
      })
    })
  })
})

describe('Given set 1 of supino-reto on screen, with two more sets of supino-reto', () => {
  describe('When the athlete records set 1 and the rest starts', () => {
    it('Then the rest should not show A seguir', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout(LETTER_A)

      await act(async () => tapNext())

      expect(screen.queryByText('A seguir')).toBeNull()
    })
  })
})

describe('Given supino-reto with restSeconds 0', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then no rest should show, set 2 should be ready and the live region should announce both steps', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout([{ ...SUPINO_RETO, restSeconds: 0 }, TRICEPS_POLIA])

      await act(async () => tapNext())

      expect({
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        sets: valueTextOf('Séries'),
        announcement: screen.getByRole('status').textContent,
      }).toEqual({
        resting: false,
        sets: '2 de 3',
        announcement: 'Série 1 de 3 registrada. Série 2 de 3',
      })
    })
  })
})

describe('Given a phone with the Screen Wake Lock API', () => {
  describe('When the athlete taps Próximo and the 90 s rest ends', () => {
    it("Then the screen should ask for the 'screen' lock at the tap and release it when the rest ends", async () => {
      vi.useFakeTimers({ now: T0 })
      const release = vi.fn(async () => {})
      const request = vi.fn(async () => ({ released: false, release }))
      Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
      stubFetch(created())
      renderWorkout(LETTER_A)

      await act(async () => tapNext())
      const atTap = { requests: request.mock.calls, releases: release.mock.calls.length }
      await act(async () => vi.advanceTimersByTime(90_000))

      expect({ atTap, releases: release.mock.calls.length }).toEqual({
        atTap: { requests: [['screen']], releases: 0 },
        releases: 1,
      })
    })
  })
})

const TRICEPS_ONE_SET = { ...TRICEPS_POLIA, sets: 1 }

describe('Given a letter with triceps-polia of one set', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the set should be sent and the screen should show Treino concluído with no rest, no Próximo and no dialog', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      renderWorkout([TRICEPS_ONE_SET])

      await act(async () => tapNext())

      expect({
        sent: sentBodies(fetchMock).map(({ setNumber }) => setNumber),
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        next: screen.queryByRole('button', { name: 'Próximo' }),
        dialog: screen.queryByRole('dialog') ?? screen.queryByRole('alertdialog'),
        announcement: screen.getByRole('status').textContent,
      }).toEqual({
        sent: [1],
        resting: false,
        title: 'Treino concluído',
        next: null,
        dialog: null,
        announcement: 'Série 1 de 1 registrada. Treino concluído',
      })
    })
  })
})

describe('Given the last set of the day and a network that fails on the first send', () => {
  describe('When the workout finishes, and then the athlete taps Reenviar with the API answering 201 and taps Fechar', () => {
    it('Then Fechar should stay disabled while the set is not sent, and call onFinish once after the resend', async () => {
      const onFinish = vi.fn()
      stubFetch(new TypeError('Failed to fetch'), created())
      renderWorkout([TRICEPS_ONE_SET], onFinish)

      await act(async () => tapNext())
      const afterFailure = {
        notice: screen.queryByText('Série não enviada') !== null,
        resend: screen.queryByRole('button', { name: 'Reenviar' }) !== null,
        close: buttonState('Fechar'),
      }
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reenviar' })))
      const afterResend = buttonState('Fechar')
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fechar' })))

      expect({ afterFailure, afterResend, onFinish: onFinish.mock.calls.length }).toEqual({
        afterFailure: { notice: true, resend: true, close: 'disabled' },
        afterResend: 'enabled',
        onFinish: 1,
      })
    })
  })
})

describe('Given the last set of the day still being sent', () => {
  describe('When the workout finishes and the athlete taps Fechar', () => {
    it('Then Fechar should be disabled and onFinish should not be called', async () => {
      const onFinish = vi.fn()
      stubFetch('pending')
      renderWorkout([TRICEPS_ONE_SET], onFinish)
      await act(async () => tapNext())

      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fechar' })))

      expect({ close: buttonState('Fechar'), onFinish: onFinish.mock.calls.length }).toEqual({
        close: 'disabled',
        onFinish: 0,
      })
    })
  })
})
