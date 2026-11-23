import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOAST_EXIT_MS, TOAST_VISIBLE_MS, ToastProvider } from '@/components/ui/toast'
import { clearActiveWorkout, loadActiveWorkout } from '@/sync/active-workout-store'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SYNC_RETRY_INTERVAL_MS } from '@/sync/sync.config'
import { SyncProvider, sendPendingItem } from '@/sync/sync-context'
import { createSyncQueue, type SendItem, type SyncQueue } from '@/sync/sync-queue'
import { CRUCIFIXO, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'
import type { Cue } from './timer-cues'
import type { TonePlayer } from './tone-player'
import {
  createWorkoutFlow,
  restoreWorkoutFlow,
  type WorkoutFlowState,
  workoutFlowReducer,
} from './workout-flow'
import { WorkoutScreen } from './workout-screen'
import type { SendOutcome } from './workout-set.types'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const STARTED_AT = '2026-11-21T18:30:00.000Z'

function flowOf(exercises = [SUPINO_RETO, PRANCHA]) {
  return createWorkoutFlow({
    workoutId: WORKOUT_ID,
    startedAt: STARTED_AT,
    programId: 'program-1',
    day: todayDay('A', 'Superior', exercises),
  })
}

// The queue sends through fetch by default, so the stubs of fetch still drive the sends.
function renderWorkout(
  exercises = [SUPINO_RETO, PRANCHA],
  onFinish = vi.fn(),
  send: SendItem = sendPendingItem,
  flow = flowOf(exercises),
  tonePlayer?: TonePlayer,
): { queue: SyncQueue } {
  const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
  render(
    <SyncProvider queue={queue}>
      <WorkoutScreen flow={flow} onFinish={onFinish} tonePlayer={tonePlayer} />
    </SyncProvider>,
  )
  return { queue }
}

// Letter 'A' of the spec: supino-reto 3 x 10 at 42,5 kg resting 90 s, then triceps-polia 3 x 12.
const LETTER_A = [SUPINO_RETO, TRICEPS_POLIA]

// A tone player that records what plays, so the test hears the cues without audio.
function recordingPlayer(): { player: TonePlayer; cues: Cue[]; unlock: ReturnType<typeof vi.fn> } {
  const cues: Cue[] = []
  const unlock = vi.fn()
  return { player: { unlock, play: (cue) => cues.push(cue) }, cues, unlock }
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
  // The finished screen also reads the windows with a GET, which has no body.
  return fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.body !== undefined)
    .map(([, init]) => JSON.parse((init as RequestInit).body as string))
}

function buttonState(name: string) {
  const button = screen.getByRole('button', { name })
  return button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true'
    ? 'disabled'
    : 'enabled'
}

// The queue also holds the finish of the workout; this counts the sets only.
function pendingSetCount(queue: SyncQueue): number {
  return queue.getSnapshot().pending.filter(({ kind }) => kind === 'set').length
}

// The value the wheel of a field shows, spoken: the athlete reads it from the wheel.
function shownOf(name: string): string {
  return screen.getByRole('spinbutton', { name }).getAttribute('aria-valuetext') ?? ''
}

function tapNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
}

afterEach(async () => {
  localStorage.clear()
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'wakeLock')
  await clearActiveWorkout()
})

// The text of the header of each exercise row; the sets of a done exercise sit below it.
function sequenceRowsOf(dialog: HTMLElement): (string | null | undefined)[] {
  return Array.from(within(dialog).getByRole('list', { name: 'Exercícios' }).children).map(
    (row) => row.firstElementChild?.textContent,
  )
}

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
    it('Then should send one set only and keep the rest at 1:30', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      renderWorkout()

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTimeAsync(300))
      await act(async () => tapNext())

      expect({ posts: fetchMock.mock.calls.length, rest: restClock() }).toEqual({
        posts: 1,
        rest: '1:30',
      })
    })
  })
})

describe('Given no connection', () => {
  describe('When the athlete records two sets of supino-reto and the queue sends again with the API answering', () => {
    it('Then the screen should show that 2 sets await sending while the rest keeps counting, and the indicator should disappear after the send', async () => {
      vi.useFakeTimers({ now: T0 })
      let outcome: SendOutcome = { status: 'retry' }
      renderWorkout([SUPINO_RETO, PRANCHA], vi.fn(), async () => outcome)

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      await act(async () => tapNext())
      const offline = {
        indicator: screen.getByRole('status', { name: '2 séries aguardando envio' }).textContent,
        icon: screen
          .getByRole('status', { name: '2 séries aguardando envio' })
          .querySelector('svg')
          ?.getAttribute('aria-hidden'),
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        next: buttonState('Próximo'),
      }
      outcome = { status: 'confirmed' }
      await act(async () => vi.advanceTimersByTimeAsync(SYNC_RETRY_INTERVAL_MS))

      expect({
        offline,
        indicatorAfter: screen.queryByRole('status', { name: /aguardando envio/ }),
      }).toEqual({
        offline: {
          indicator: '2 séries aguardando envio',
          icon: 'true',
          resting: true,
          next: 'enabled',
        },
        indicatorAfter: null,
      })
    })
  })
})

describe('Given the API answers 401 to the send', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the workout screen should stay and show that 1 set awaits sending, with no resend button', async () => {
      stubFetch(new Response(JSON.stringify({ code: 'unauthenticated' }), { status: 401 }))
      renderWorkout()

      await act(async () => tapNext())

      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        indicator: screen.queryByRole('status', { name: '1 série aguardando envio' }) !== null,
        resend: screen.queryByRole('button', { name: 'Reenviar' }),
      }).toEqual({ title: 'Supino reto', indicator: true, resend: null })
    })
  })
})

describe('Given a workout restored with set 1 already recorded', () => {
  describe('When the screen opens and the queue is empty', () => {
    it('Then the restored set should not be queued again', async () => {
      const recorded = workoutFlowReducer(flowOf(), { type: 'next', nowMs: T0 })
      const { queue } = renderWorkout(
        undefined,
        vi.fn(),
        async () => ({ status: 'retry' }),
        recorded,
      )

      await act(async () => {})

      expect(queue.getSnapshot().pending).toEqual([])
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
        load: shownOf('Carga'),
        target: shownOf('Repetições'),
        sets: valueTextOf('Séries'),
      }
      await act(async () => vi.advanceTimersByTime(800))
      await act(async () => tapNext())

      expect({ ready, sent: sentBodies(fetchMock).map(({ setNumber }) => setNumber) }).toEqual({
        ready: { resting: false, load: '42,5 quilos', target: '10 repetições', sets: '2 de 3' },
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
    .getByRole('spinbutton', { name: 'Carga' })
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
        load: shownOf('Carga'),
        target: shownOf('Repetições'),
        sets: valueTextOf('Séries'),
        exercises: valueTextOf('Exercícios'),
        announcement: screen.getByRole('status').textContent,
      }).toEqual({
        duringRest: { title: 'Supino reto', upNext: true, upNextName: true },
        title: 'Tríceps na polia',
        load: '20 quilos',
        target: '12 repetições',
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
        // The finish of the workout follows the set to its own route; only sets count here.
        sent: sentBodies(fetchMock)
          .filter((body) => 'setNumber' in body)
          .map(({ setNumber }) => setNumber),
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

describe('Given the last set of the day with the network failing', () => {
  describe('When the workout finishes and the athlete taps Fechar', () => {
    it('Then Fechar should be enabled with the set in the queue, clear the workout in progress and call onFinish once', async () => {
      const onFinish = vi.fn()
      const { queue } = renderWorkout([TRICEPS_ONE_SET], onFinish, async () => ({
        status: 'retry',
      }))
      await act(async () => tapNext())
      const beforeClose = {
        close: buttonState('Fechar'),
        saved: (await loadActiveWorkout(Date.now()))?.phase,
        pending: pendingSetCount(queue),
      }

      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fechar' })))

      expect({
        beforeClose,
        saved: await loadActiveWorkout(Date.now()),
        pending: pendingSetCount(queue),
        onFinish: onFinish.mock.calls.length,
      }).toEqual({
        beforeClose: { close: 'enabled', saved: 'finished', pending: 1 },
        saved: null,
        pending: 1,
        onFinish: 1,
      })
    })
  })
})

const TRICEPS_WINDOWS = {
  now: new Date(T0).toISOString(),
  groups: [
    {
      muscleGroup: { slug: 'triceps', name: 'tríceps' },
      state: 'resting',
      lastTrainedAt: new Date(T0).toISOString(),
      opensAt: new Date(T0 + 48 * 3_600_000).toISOString(),
      closesAt: new Date(T0 + 96 * 3_600_000).toISOString(),
    },
  ],
}

describe('Given a workout of triceps-polia finished with the queue sent', () => {
  describe('When the finished-workout screen settles', () => {
    it('Then should show the section "Janelas reabrem" with the triceps row and keep Fechar visible', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = vi.fn(async (url: string) =>
        url === '/api/windows' ? new Response(JSON.stringify(TRICEPS_WINDOWS)) : created(),
      )
      vi.stubGlobal('fetch', fetchMock)
      renderWorkout([TRICEPS_ONE_SET])

      await act(async () => tapNext())

      const region = screen.getByRole('region', { name: 'Janelas reabrem' })
      expect({
        row: within(region).getByRole('img').getAttribute('aria-label'),
        close: buttonState('Fechar'),
      }).toEqual({
        row: expect.stringMatching(/^Tríceps, abre .+ às \d{1,2}h(\d{2})?$/),
        close: 'enabled',
      })
    })
  })
})

describe('Given a workout of triceps-polia finished with the set still in the queue', () => {
  describe('When the finished-workout screen settles', () => {
    it('Then should not ask for the windows and should not show the section', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = vi.fn(async () => new Response(JSON.stringify(TRICEPS_WINDOWS)))
      vi.stubGlobal('fetch', fetchMock)
      renderWorkout([TRICEPS_ONE_SET], vi.fn(), async () => ({ status: 'retry' }))

      await act(async () => tapNext())

      expect({
        asked: fetchMock.mock.calls.length,
        section: screen.queryByRole('region', { name: 'Janelas reabrem' }),
      }).toEqual({ asked: 0, section: null })
    })
  })
})

// Letter 'A' of the US-F03-04 fixture: supino-reto, crucifixo and triceps-polia, 3 sets each.
const THREE_EXERCISES = [SUPINO_RETO, CRUCIFIXO, TRICEPS_POLIA]

// A flow brought to the given number of recorded sets by taps one second apart, skipping each rest.
function flowAfterSets(exercises: typeof THREE_EXERCISES, count: number): WorkoutFlowState {
  let state = flowOf(exercises)
  let nowMs = T0
  for (let set = 0; set < count; set += 1) {
    state = workoutFlowReducer(state, { type: 'next', nowMs })
    nowMs += 1000
    if (state.phase === 'rest') {
      state = workoutFlowReducer(state, { type: 'next', nowMs })
      nowMs += 1000
    }
  }
  return state
}

const TOP_CONTROL_ON_CRUCIFIXO = 'Sequência do treino, letra A, exercício 2 de 3'

describe('Given the 3 sets of supino-reto recorded and set 1 of crucifixo on screen', () => {
  describe('When the athlete taps the top control', () => {
    it('Then a dialog should list supino-reto as done, crucifixo as current and triceps-polia as to do, in that order, with an Encerrar button', async () => {
      renderWorkout(THREE_EXERCISES, vi.fn(), sendPendingItem, flowAfterSets(THREE_EXERCISES, 3))

      fireEvent.click(screen.getByRole('button', { name: TOP_CONTROL_ON_CRUCIFIXO }))

      const dialog = await screen.findByRole('dialog')
      expect({
        items: sequenceRowsOf(dialog),
        end: within(dialog).queryByRole('button', { name: 'Encerrar' }) !== null,
      }).toEqual({
        items: [
          'Supino retoFeito3 de 3',
          'CrucifixoAtual0 de 3Pular',
          'Tríceps na poliaPor fazer0 de 3',
        ],
        end: true,
      })
    })
  })

  describe('When the athlete opens the sheet and closes it', () => {
    it('Then the focus should return to the top control', async () => {
      renderWorkout(THREE_EXERCISES, vi.fn(), sendPendingItem, flowAfterSets(THREE_EXERCISES, 3))
      const topControl = screen.getByRole('button', { name: TOP_CONTROL_ON_CRUCIFIXO })
      fireEvent.click(topControl)
      const dialog = await screen.findByRole('dialog')

      fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }))

      await waitFor(() => expect(document.activeElement).toBe(topControl))
    })
  })
})

async function openSequence(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  await act(async () => {})
  return screen.getByRole('dialog')
}

describe('Given the 90 s rest after set 1 of supino-reto, with the letter supino-reto, crucifixo and triceps-polia', () => {
  describe('When the athlete picks triceps-polia in the sequence sheet', () => {
    it('Then the ring should keep the time left, A seguir should show triceps-polia, and when the rest ends the screen should show triceps-polia with 20 kg and 12 rep', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout(THREE_EXERCISES)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(10_000))

      const dialog = await openSequence('Sequência do treino, letra A, exercício 1 de 3')
      fireEvent.click(within(dialog).getByRole('button', { name: /Tríceps na polia/ }))
      await act(async () => {})
      const afterPick = {
        dialog: screen.queryByRole('dialog'),
        clock: restClock(),
        upNext: screen.queryByText('A seguir') !== null,
        upNextName: screen.queryByText('Tríceps na polia') !== null,
      }
      await act(async () => vi.advanceTimersByTime(80_000))

      expect({
        afterPick,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        load: shownOf('Carga'),
        target: shownOf('Repetições'),
        announcement: screen.getByRole('status').textContent,
      }).toEqual({
        afterPick: { dialog: null, clock: '1:20', upNext: true, upNextName: true },
        title: 'Tríceps na polia',
        load: '20 quilos',
        target: '12 repetições',
        announcement: 'Tríceps na polia, série 1 de 3',
      })
    })
  })

  describe('When the athlete picks triceps-polia and then taps Próximo', () => {
    it('Then the rest should be skipped and triceps-polia should show with Próximo enabled', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout(THREE_EXERCISES)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(10_000))
      const dialog = await openSequence('Sequência do treino, letra A, exercício 1 de 3')
      fireEvent.click(within(dialog).getByRole('button', { name: /Tríceps na polia/ }))
      await act(async () => vi.advanceTimersByTime(1000))

      act(() => tapNext())

      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        next: buttonState('Próximo'),
        resting: screen.queryByRole('timer', { name: 'Descanso' }),
      }).toEqual({ title: 'Tríceps na polia', next: 'enabled', resting: null })
    })
  })
})

describe('Given set 2 of supino-reto on screen after a skipped rest', () => {
  describe('When the athlete picks triceps-polia in the sequence sheet and opens it again', () => {
    it('Then triceps-polia should show with Próximo enabled and supino-reto should read Por fazer with 1 de 3', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created())
      renderWorkout(THREE_EXERCISES)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
      act(() => tapNext())
      const dialog = await openSequence('Sequência do treino, letra A, exercício 1 de 3')

      fireEvent.click(within(dialog).getByRole('button', { name: /Tríceps na polia/ }))
      await act(async () => {})
      const afterPick = {
        title: screen.getByRole('heading', { level: 1 }).textContent,
        next: buttonState('Próximo'),
        sets: valueTextOf('Séries'),
      }
      const reopened = await openSequence('Sequência do treino, letra A, exercício 1 de 3')

      expect({
        afterPick,
        supino: sequenceRowsOf(reopened)[0],
      }).toEqual({
        afterPick: { title: 'Tríceps na polia', next: 'enabled', sets: '1 de 3' },
        supino: 'Supino retoPor fazer1 de 3',
      })
    })
  })
})

describe('Given the athlete picked triceps-polia in the sequence sheet outside the rest', () => {
  describe('When Próximo is tapped 500 ms after the pick', () => {
    it('Then no set should be sent and the live region should announce Tríceps na polia, série 1 de 3', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      renderWorkout(THREE_EXERCISES)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
      act(() => tapNext())
      const dialog = await openSequence('Sequência do treino, letra A, exercício 1 de 3')
      fireEvent.click(within(dialog).getByRole('button', { name: /Tríceps na polia/ }))
      await act(async () => vi.advanceTimersByTime(500))
      fetchMock.mockClear()

      await act(async () => tapNext())

      expect({
        sent: fetchMock.mock.calls.length,
        announcement: screen.getByRole('status').textContent,
      }).toEqual({ sent: 0, announcement: 'Tríceps na polia, série 1 de 3' })
    })
  })
})

// Records the given number of sets with taps one second apart; each rest is skipped by the next
// tap, so the last set recorded leaves the rest counting.
async function tapSets(count: number) {
  for (let set = 0; set < count; set += 1) {
    if (set > 0) {
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
    }
    await act(async () => tapNext())
    await act(async () => vi.advanceTimersByTime(1000))
  }
}

const NEVER_SENT: SendItem = async () => ({ status: 'retry' })

describe('Given 4 of 9 sets recorded', () => {
  describe('When the athlete taps Encerrar in the sequence sheet and then Encerrar in the confirmation', () => {
    it('Then the confirmation should show 4 sets done and 5 left, the queue should hold the 4 sets followed by a finish ended_early at the confirmation instant, the workout in progress should be cleared and onFinish should be called', async () => {
      vi.useFakeTimers({ now: T0 })
      const onFinish = vi.fn()
      const { queue } = renderWorkout(THREE_EXERCISES, onFinish, NEVER_SENT)
      await tapSets(4)
      const confirmMs = Date.now()

      const sequence = await openSequence('Sequência do treino, letra A, exercício 2 de 3')
      fireEvent.click(within(sequence).getByRole('button', { name: 'Encerrar' }))
      await act(async () => {})
      const confirmation = screen.getByRole('dialog')
      const counts = within(confirmation)
        .getAllByText(/^\d+ séries? (feitas?|que faltam?)$/)
        .map((node) => node.textContent)
      await act(async () => {
        fireEvent.click(within(confirmation).getByRole('button', { name: 'Encerrar' }))
      })

      expect({
        counts,
        pending: queue
          .getSnapshot()
          .pending.map(({ kind, body }) => [kind, kind === 'finish' ? body : undefined]),
        saved: await loadActiveWorkout(Date.now()),
        finished: onFinish.mock.calls.length,
      }).toEqual({
        counts: ['4 séries feitas', '5 séries que faltam'],
        pending: [
          ['set', undefined],
          ['set', undefined],
          ['set', undefined],
          ['set', undefined],
          ['finish', { finishedAt: new Date(confirmMs).toISOString(), endReason: 'ended_early' }],
        ],
        saved: null,
        finished: 1,
      })
    })
  })
})

describe('Given the end confirmation open after 4 of 9 sets recorded', () => {
  describe('When the athlete taps Continuar', () => {
    it('Then the confirmation should close, no set or finish should be queued beyond the 4 sets and the workout should go on', async () => {
      vi.useFakeTimers({ now: T0 })
      const onFinish = vi.fn()
      const { queue } = renderWorkout(THREE_EXERCISES, onFinish, NEVER_SENT)
      await tapSets(4)
      const sequence = await openSequence('Sequência do treino, letra A, exercício 2 de 3')
      fireEvent.click(within(sequence).getByRole('button', { name: 'Encerrar' }))
      await act(async () => {})

      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continuar' }))
      await act(async () => {})

      expect({
        dialog: screen.queryByRole('dialog'),
        kinds: queue.getSnapshot().pending.map(({ kind }) => kind),
        saved: (await loadActiveWorkout(Date.now()))?.recorded.length,
        onFinish: onFinish.mock.calls.length,
      }).toEqual({ dialog: null, kinds: ['set', 'set', 'set', 'set'], saved: 4, onFinish: 0 })
    })
  })
})

describe('Given the end confirmation open during the 60 s rest after set 4, with the rest running out under it', () => {
  describe('When the athlete taps Continuar', () => {
    it('Then no set should be recorded, the rest should stay on screen until the sheet closes and set 2 of crucifixo should show only then', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWorkout(THREE_EXERCISES, vi.fn(), NEVER_SENT)
      await tapSets(4)
      const sequence = await openSequence('Sequência do treino, letra A, exercício 2 de 3')
      fireEvent.click(within(sequence).getByRole('button', { name: 'Encerrar' }))
      await act(async () => vi.advanceTimersByTime(70_000))
      // The modal sheet hides the screen from the accessibility tree, so the queries look for hidden nodes.
      const underSheet = {
        resting: screen.queryByRole('timer', { name: 'Descanso', hidden: true }) !== null,
        sets: document
          .querySelector('[role="progressbar"][aria-label="Séries"]')
          ?.getAttribute('aria-valuetext'),
      }

      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continuar' }))
      await act(async () => vi.advanceTimersByTime(300))

      expect({
        underSheet,
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        sets: valueTextOf('Séries'),
        saved: (await loadActiveWorkout(Date.now()))?.recorded.length,
      }).toEqual({
        underSheet: { resting: true, sets: '1 de 3' },
        resting: false,
        title: 'Crucifixo',
        sets: '2 de 3',
        saved: 4,
      })
    })
  })
})

describe('Given no set recorded', () => {
  describe('When the athlete confirms Encerrar', () => {
    it('Then nothing should be queued, the workout in progress should be cleared and onFinish should be called', async () => {
      vi.useFakeTimers({ now: T0 })
      const onFinish = vi.fn()
      const { queue } = renderWorkout(THREE_EXERCISES, onFinish, NEVER_SENT)
      const sequence = await openSequence('Sequência do treino, letra A, exercício 1 de 3')
      fireEvent.click(within(sequence).getByRole('button', { name: 'Encerrar' }))
      await act(async () => {})

      await act(async () => {
        fireEvent.click(
          within(screen.getByRole('dialog')).getByRole('button', { name: 'Encerrar' }),
        )
      })

      expect({
        pending: queue.getSnapshot().pending,
        saved: await loadActiveWorkout(Date.now()),
        onFinish: onFinish.mock.calls.length,
      }).toEqual({ pending: [], saved: null, onFinish: 1 })
    })
  })
})

// One exercise of 2 sets: the second set is the last missing set of the day.
const TRICEPS_TWO_SETS = { ...TRICEPS_POLIA, sets: 2 }

describe('Given the last missing set of the day on screen', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the screen should show Treino concluído with no confirmation and the queue should hold the 2 sets followed by a finish completed at the performedAt of the last set', async () => {
      vi.useFakeTimers({ now: T0 })
      const { queue } = renderWorkout([TRICEPS_TWO_SETS], vi.fn(), NEVER_SENT)
      await tapSets(2)
      await act(async () => vi.advanceTimersByTime(300))

      const pending = queue.getSnapshot().pending
      const lastSet = pending.filter(({ kind }) => kind === 'set').at(-1)
      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        dialog: screen.queryByRole('dialog'),
        kinds: pending.map(({ kind }) => kind),
        finish: pending.at(-1)?.body,
      }).toEqual({
        title: 'Treino concluído',
        dialog: null,
        kinds: ['set', 'set', 'finish'],
        finish: {
          finishedAt: (lastSet?.body as { performedAt: string } | undefined)?.performedAt,
          endReason: 'completed',
        },
      })
    })
  })
})

describe('Given a finished workout restored from the device', () => {
  describe('When the screen opens', () => {
    it('Then should show Treino concluído and queue nothing, since the finish comes from the saved state', async () => {
      const finished = flowAfterSets([TRICEPS_TWO_SETS] as typeof THREE_EXERCISES, 2)
      const { queue } = renderWorkout([TRICEPS_TWO_SETS], vi.fn(), NEVER_SENT, finished)
      await act(async () => {})

      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        phase: finished.phase,
        pending: queue.getSnapshot().pending,
      }).toEqual({ title: 'Treino concluído', phase: 'finished', pending: [] })
    })
  })
})

describe('Given set 1 of supino-reto and set 1 of triceps-polia recorded, with triceps-polia resting', () => {
  describe('When the athlete picks supino-reto in the sequence sheet and skips the rest', () => {
    it('Then the set dots should mark 1 recorded set of supino-reto, not the 2 sets of the workout', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch(created(), created())
      renderWorkout(THREE_EXERCISES)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
      act(() => tapNext())
      const toTriceps = await openSequence('Sequência do treino, letra A, exercício 1 de 3')
      fireEvent.click(within(toTriceps).getByRole('button', { name: /Tríceps na polia/ }))
      await act(async () => vi.advanceTimersByTime(1000))
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
      const toSupino = await openSequence('Sequência do treino, letra A, exercício 1 de 3')

      fireEvent.click(within(toSupino).getByRole('button', { name: /Supino reto/ }))
      await act(async () => vi.advanceTimersByTime(1000))
      act(() => tapNext())

      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        recordedDots: document.querySelectorAll('[data-recorded="true"]').length,
        sets: valueTextOf('Séries'),
      }).toEqual({ title: 'Supino reto', recordedDots: 1, sets: '2 de 3' })
    })
  })
})

describe('Given the sequence sheet open', () => {
  describe('When the athlete presses Escape', () => {
    it('Then the sheet should close and the focus should return to the top control', async () => {
      renderWorkout(THREE_EXERCISES, vi.fn(), sendPendingItem, flowAfterSets(THREE_EXERCISES, 3))
      const topControl = screen.getByRole('button', { name: TOP_CONTROL_ON_CRUCIFIXO })
      fireEvent.click(topControl)
      const dialog = await screen.findByRole('dialog')

      fireEvent.keyDown(dialog, { key: 'Escape' })

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.activeElement).toBe(topControl)
    })
  })
})

// Letter 'A' of the US-F03-05 spec: supino-reto, prancha (time) and triceps-polia.
const SKIP_LETTER = [SUPINO_RETO, PRANCHA, TRICEPS_POLIA]

const TOP_CONTROL_ON_PRANCHA = 'Sequência do treino, letra A, exercício 2 de 3'

// The 3 sets of supino-reto recorded and set 1 of prancha on screen; returns the clock after the last tap.
function flowOnPrancha(): { flow: WorkoutFlowState; clockMs: number } {
  const flow = flowAfterSets(SKIP_LETTER, 3)
  return { flow, clockMs: T0 + 6000 }
}

describe('Given the 3 sets of supino-reto recorded and set 1 of prancha on screen', () => {
  describe('When the athlete opens the sequence and taps "Pular Prancha"', () => {
    it('Then the sheet should close, the focus should return to the top control, the screen should show triceps-polia with 20 kg and 12 rep, and the sequence reopened should list prancha as "Pulado" with "0 de 3"', async () => {
      vi.useFakeTimers({ now: T0 + 60_000 })
      renderWorkout(SKIP_LETTER, vi.fn(), NEVER_SENT, flowOnPrancha().flow)
      const topControl = screen.getByRole('button', { name: TOP_CONTROL_ON_PRANCHA })
      const dialog = await openSequence(TOP_CONTROL_ON_PRANCHA)

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Pular Prancha' }))
      })
      await act(async () => vi.advanceTimersByTime(500))

      const afterSkip = {
        dialog: screen.queryByRole('dialog'),
        focusOnTopControl: document.activeElement === topControl,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        load: shownOf('Carga'),
        target: shownOf('Repetições'),
      }
      const reopened = await openSequence('Sequência do treino, letra A, exercício 2 de 3')
      expect({
        afterSkip,
        items: sequenceRowsOf(reopened),
      }).toEqual({
        afterSkip: {
          dialog: null,
          focusOnTopControl: true,
          title: 'Tríceps na polia',
          load: '20 quilos',
          target: '12 repetições',
        },
        items: ['Supino retoFeito3 de 3', 'PranchaPulado0 de 3', 'Tríceps na poliaAtual0 de 3'],
      })
    })
  })

  describe('When the athlete skips prancha and then taps its row in the sequence', () => {
    it('Then the screen should show prancha with 45 s', async () => {
      vi.useFakeTimers({ now: T0 + 60_000 })
      renderWorkout(SKIP_LETTER, vi.fn(), NEVER_SENT, flowOnPrancha().flow)
      const dialog = await openSequence(TOP_CONTROL_ON_PRANCHA)
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Pular Prancha' }))
      })
      await act(async () => vi.advanceTimersByTime(500))
      const reopened = await openSequence('Sequência do treino, letra A, exercício 2 de 3')

      await act(async () => {
        fireEvent.click(within(reopened).getByRole('button', { name: /Prancha/ }))
      })
      await act(async () => vi.advanceTimersByTime(500))

      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        target: shownOf('Tempo'),
      }).toEqual({ title: 'Prancha', target: '45 segundos' })
    })
  })
})

describe('Given the 90 s rest after the 3rd set of supino-reto with prancha as upcoming', () => {
  describe('When the athlete skips prancha in the sequence', () => {
    it('Then the ring should keep the time left, A seguir should show triceps-polia, and when the rest ends the screen should show set 1 of triceps-polia', async () => {
      vi.useFakeTimers({ now: T0 + 60_000 })
      renderWorkout(SKIP_LETTER, vi.fn(), NEVER_SENT, flowAfterSets(SKIP_LETTER, 2))
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(10_000))
      const dialog = await openSequence(TOP_CONTROL_ON_PRANCHA)

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Pular Prancha' }))
      })
      await act(async () => vi.advanceTimersByTime(500))
      const duringRest = {
        dialog: screen.queryByRole('dialog'),
        clock: restClock(),
        upNext: screen.queryByText('A seguir') !== null,
        upNextName: screen.queryByText('Tríceps na polia') !== null,
      }
      await act(async () => vi.advanceTimersByTime(80_000))

      expect({
        duringRest,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        load: shownOf('Carga'),
      }).toEqual({
        duringRest: { dialog: null, clock: '1:20', upNext: true, upNextName: true },
        title: 'Tríceps na polia',
        load: '20 quilos',
      })
    })
  })
})

// Supino-reto done, prancha skipped and the last set of triceps-polia on screen. Returns the flow
// and a clock past its last step, so the first tap is not taken as a double tap.
function flowOnLastTricepsSetWithPranchaSkipped(): { flow: WorkoutFlowState; nowMs: number } {
  let flow = flowAfterSets(SKIP_LETTER, 3)
  flow = workoutFlowReducer(flow, { type: 'skip', nowMs: T0 + 10_000 })
  let nowMs = T0 + 11_000
  for (let set = 0; set < 2; set += 1) {
    flow = workoutFlowReducer(flow, { type: 'next', nowMs })
    nowMs += 1000
    flow = workoutFlowReducer(flow, { type: 'next', nowMs })
    nowMs += 1000
  }
  return { flow, nowMs: nowMs + 5000 }
}

describe('Given supino-reto done, prancha skipped and the last set of triceps-polia on screen', () => {
  describe('When the athlete taps "Próximo"', () => {
    it('Then the screen should show "Treino concluído" with no confirmation, a "Ficaram de fora" section listing prancha with "0 de 3", the bar "Exercícios" at "2 de 3", and the queue should hold the new set, then the skip of prancha with its skippedAt, then the finish completed', async () => {
      const { flow, nowMs } = flowOnLastTricepsSetWithPranchaSkipped()
      vi.useFakeTimers({ now: nowMs })
      const { queue } = renderWorkout(SKIP_LETTER, vi.fn(), NEVER_SENT, flow)

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(300))

      const section = screen.getByRole('region', { name: 'Ficaram de fora' })
      const pending = queue.getSnapshot().pending
      const lastSet = pending[0]?.body as { performedAt: string } | undefined
      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        dialog: screen.queryByRole('dialog'),
        leftOut: within(section)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
        bar: screen.getByRole('progressbar', { name: 'Exercícios' }).getAttribute('aria-valuetext'),
        queue: pending.map(({ kind, body }) => [kind, body]),
      }).toEqual({
        title: 'Treino concluído',
        dialog: null,
        leftOut: ['Prancha0 de 3'],
        bar: '2 de 3',
        queue: [
          ['set', expect.objectContaining({ plannedExerciseId: 'planned-triceps', setNumber: 3 })],
          ['skip', { plannedExerciseId: 'planned-prancha', skippedAt: flow.skipped[0]?.skippedAt }],
          ['finish', { finishedAt: lastSet?.performedAt, endReason: 'completed' }],
        ],
      })
    })
  })
})

describe('Given the last missing set of the day with nothing skipped', () => {
  describe('When the athlete taps "Próximo"', () => {
    it('Then the screen should have no "Ficaram de fora" section and the bar should read the total', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWorkout([TRICEPS_TWO_SETS], vi.fn(), NEVER_SENT)
      await tapSets(2)
      await act(async () => vi.advanceTimersByTime(300))

      expect({
        section: screen.queryByRole('region', { name: 'Ficaram de fora' }),
        bar: screen.getByRole('progressbar', { name: 'Exercícios' }).getAttribute('aria-valuetext'),
      }).toEqual({ section: null, bar: '1 de 1' })
    })
  })
})

describe('Given prancha skipped and one set of triceps-polia on screen after supino-reto', () => {
  describe('When the athlete records a set and ends the workout early', () => {
    it('Then the queue should hold the set, the skip and the finish ended_early, and onFinish should be called with no summary shown', async () => {
      const base = flowAfterSets(SKIP_LETTER, 3)
      const skipped = workoutFlowReducer(base, { type: 'skip', nowMs: T0 + 10_000 })
      vi.useFakeTimers({ now: T0 + 60_000 })
      const onFinish = vi.fn()
      const { queue } = renderWorkout(SKIP_LETTER, onFinish, NEVER_SENT, skipped)
      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(1000))
      const dialog = await openSequence('Sequência do treino, letra A, exercício 2 de 3')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Encerrar' }))
      await act(async () => {})
      const confirmation = screen.getByRole('dialog')

      await act(async () => {
        fireEvent.click(within(confirmation).getByRole('button', { name: 'Encerrar' }))
      })

      expect({
        queue: queue.getSnapshot().pending.map(({ kind, body }) => [kind, body]),
        finished: onFinish.mock.calls.length,
        summary: screen.queryByRole('region', { name: 'Ficaram de fora' }),
      }).toEqual({
        queue: [
          ['set', expect.objectContaining({ plannedExerciseId: 'planned-triceps', setNumber: 1 })],
          [
            'skip',
            { plannedExerciseId: 'planned-prancha', skippedAt: skipped.skipped[0]?.skippedAt },
          ],
          ['finish', { finishedAt: new Date(T0 + 61_000).toISOString(), endReason: 'ended_early' }],
        ],
        finished: 1,
        summary: null,
      })
    })
  })
})

describe('Given the first exercise skipped before any set was recorded', () => {
  describe('When the athlete ends the workout', () => {
    it('Then nothing should be queued, not even the skip', async () => {
      vi.useFakeTimers({ now: T0 + 60_000 })
      const skipped = workoutFlowReducer(flowOf([SUPINO_RETO, PRANCHA]), {
        type: 'skip',
        nowMs: T0,
      })
      const onFinish = vi.fn()
      const { queue } = renderWorkout([SUPINO_RETO, PRANCHA], onFinish, NEVER_SENT, skipped)
      const dialog = await openSequence('Sequência do treino, letra A, exercício 1 de 2')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Encerrar' }))
      await act(async () => {})
      const confirmation = screen.getByRole('dialog')

      await act(async () => {
        fireEvent.click(within(confirmation).getByRole('button', { name: 'Encerrar' }))
      })

      expect({
        pending: queue.getSnapshot().pending,
        finished: onFinish.mock.calls.length,
      }).toEqual({ pending: [], finished: 1 })
    })
  })
})

describe('Given a workout restored from a saved state with the 3 sets of supino-reto recorded and set 1 of prancha on screen', () => {
  describe('When the athlete taps the top control', () => {
    it('Then the dialog should list "Séries de Supino reto" with the 3 sets at 42,5 kg and 10 repetições', async () => {
      const saved = flowAfterSets([SUPINO_RETO, PRANCHA] as typeof THREE_EXERCISES, 3)
      const restored = restoreWorkoutFlow(saved, T0 + 60_000)
      renderWorkout([SUPINO_RETO, PRANCHA], vi.fn(), NEVER_SENT, restored)

      const dialog = await openSequence('Sequência do treino, letra A, exercício 2 de 2')

      const sets = within(dialog).getByRole('list', { name: 'Séries de Supino reto' })
      expect(
        within(sets)
          .getAllByText(/^Série \d: /)
          .map((node) => node.textContent),
      ).toEqual([
        'Série 1: 42,5 kg, 10 repetições',
        'Série 2: 42,5 kg, 10 repetições',
        'Série 3: 42,5 kg, 10 repetições',
      ])
    })
  })
})

describe('Given the screen Treino concluído after the last set of the day', () => {
  describe('When the athlete taps the top control', () => {
    it('Then the dialog should list the sets of each exercise in program order and offer only Fechar', async () => {
      const exercises = [TRICEPS_TWO_SETS, { ...SUPINO_RETO, sets: 2 }]
      const finished = flowAfterSets(exercises as typeof THREE_EXERCISES, 4)
      renderWorkout(exercises, vi.fn(), NEVER_SENT, finished)

      const dialog = await openSequence('Sequência do treino, letra A, exercício 2 de 2')

      expect({
        lists: within(dialog)
          .getAllByRole('list')
          .map((list) => list.getAttribute('aria-label')),
        buttons: within(dialog)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label') ?? button.textContent),
      }).toEqual({
        lists: ['Exercícios', 'Séries de Tríceps na polia', 'Séries de Supino reto'],
        buttons: ['Fechar'],
      })
    })
  })
})

const ALWAYS_REJECTED: SendItem = async () => ({
  status: 'rejected',
  code: 'test_rejection',
  message: 'Refused by the test double.',
})

describe('Given the API refused every set of supino-reto after the athlete recorded the 3 sets', () => {
  describe('When the athlete opens the sequence', () => {
    it('Then the dialog should still list the 3 recorded sets of supino-reto', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWorkout([SUPINO_RETO, PRANCHA], vi.fn(), ALWAYS_REJECTED)
      await tapSets(3)
      await act(async () => vi.advanceTimersByTime(300))

      const dialog = await openSequence('Sequência do treino, letra A, exercício 2 de 2')

      const sets = within(dialog).getByRole('list', { name: 'Séries de Supino reto' })
      expect(within(sets).getAllByText(/^Série \d: /)).toHaveLength(3)
    })
  })
})

const ONLY_PRANCHA = [PRANCHA]

function countdownClock() {
  return screen.getByRole('timer', { name: 'Contagem para começar' }).textContent
}

function ariaDisabled(name: string) {
  return screen.getByRole('button', { name }).getAttribute('aria-disabled')
}

const TOP_CONTROL_ONLY_PRANCHA = 'Sequência do treino, letra A, exercício 1 de 1'

describe('Given the workout screen on set 1 of prancha, a timed exercise', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then the count should read 3, 2, 1 with a cue each, with Próximo and the sequence control disabled and no set queued', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      const { player, cues, unlock } = recordingPlayer()
      const { queue } = renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)

      await act(async () => tapNext())
      const atTap = {
        count: countdownClock(),
        next: ariaDisabled('Próximo'),
        topControl: ariaDisabled(TOP_CONTROL_ONLY_PRANCHA),
        pendingSets: pendingSetCount(queue),
        unlocked: unlock.mock.calls.length,
        cues: [...cues],
      }
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      const afterOneSecond = countdownClock()
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      const afterTwoSeconds = countdownClock()
      await act(async () => tapNext())

      expect({
        atTap,
        afterOneSecond,
        afterTwoSeconds,
        cuesAfterTwoSeconds: cues,
        countAfterTapOnCount: countdownClock(),
      }).toEqual({
        atTap: {
          count: '3',
          next: 'true',
          topControl: 'true',
          pendingSets: 0,
          unlocked: 1,
          cues: ['count'],
        },
        afterOneSecond: '2',
        afterTwoSeconds: '1',
        cuesAfterTwoSeconds: ['count', 'count', 'count'],
        countAfterTapOnCount: '1',
      })
    })
  })
})

function executionClock() {
  return screen.getByRole('timer', { name: 'Tempo de execução' }).textContent
}

describe('Given the count of prancha at 1', () => {
  describe('When the count ends', () => {
    it('Then the start cue should play and the ring should show 0:45 with Cancelar and Som, announced as Começou', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      const { player, cues } = recordingPlayer()
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())

      for (let second = 0; second < 3; second++) {
        await act(async () => vi.advanceTimersByTimeAsync(1000))
      }
      const ring = screen.getByRole('progressbar', { name: 'Execução restante' })

      expect({
        cues,
        clock: executionClock(),
        ring: {
          now: ring.getAttribute('aria-valuenow'),
          max: ring.getAttribute('aria-valuemax'),
          text: ring.getAttribute('aria-valuetext'),
        },
        timerInsideRing: ring.contains(screen.getByRole('timer', { name: 'Tempo de execução' })),
        announced: screen.getByRole('status').textContent,
        controls: [
          screen.queryByRole('button', { name: 'Cancelar' }) !== null,
          screen.queryByRole('button', { name: 'Som' }) !== null,
        ],
      }).toEqual({
        cues: ['count', 'count', 'count', 'start'],
        clock: '0:45',
        ring: { now: '45', max: '45', text: '0:45' },
        timerInsideRing: false,
        announced: 'Começou',
        controls: [true, true],
      })
    })
  })
})

async function passSeconds(seconds: number) {
  for (let second = 0; second < seconds; second++) {
    await act(async () => vi.advanceTimersByTimeAsync(1000))
  }
}

function ringTone() {
  return screen
    .getByRole('timer', { name: 'Tempo de execução' })
    .parentElement?.getAttribute('data-tone')
}

describe('Given the execution of prancha running', () => {
  describe('When it goes from 4 s left to the end', () => {
    it('Then the ring should turn to warning at 3 s with a cue each second, then play the end cue, queue 45 s and rest for 1:00', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      const { player, cues } = recordingPlayer()
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())
      await passSeconds(3 + 41)
      const at4 = { tone: ringTone(), clock: executionClock() }
      cues.length = 0

      await passSeconds(1)
      const at3 = { tone: ringTone(), clock: executionClock() }
      await passSeconds(3)

      expect({
        at4,
        at3,
        cues,
        set: sentBodies(fetchMock)[0],
        rest: restClock(),
        announced: screen.getByRole('status').textContent,
      }).toEqual({
        at4: { tone: null, clock: '0:04' },
        at3: { tone: 'warning', clock: '0:03' },
        cues: ['warning', 'warning', 'warning', 'end'],
        set: expect.objectContaining({ setNumber: 1, seconds: 45, loadG: 0 }),
        rest: '1:00',
        announced: 'Série 1 de 3 registrada',
      })
    })
  })
})

describe('Given the execution of prancha with 0:30 on the ring', () => {
  describe('When the athlete taps Próximo', () => {
    it('Then should queue 15 s, rest for 1:00 with no end cue, and ignore a second tap 300 ms later', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      const { player, cues } = recordingPlayer()
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())
      await passSeconds(3 + 15)
      const before = executionClock()

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTimeAsync(300))
      await act(async () => tapNext())

      expect({
        before,
        sets: sentBodies(fetchMock).map(({ seconds }) => seconds),
        rest: restClock(),
        endCue: cues.includes('end'),
      }).toEqual({ before: '0:30', sets: [15], rest: '1:00', endCue: false })
    })
  })
})

describe.each([
  { name: 'the count', secondsBefore: 1 },
  { name: 'the execution', secondsBefore: 3 + 15 },
])('Given the timer of prancha in $name', ({ secondsBefore }) => {
  describe('When the athlete taps Cancelar', () => {
    it('Then prancha should be back on set 1 of 3 with the target of 45 s, nothing queued and no new cue, and a quick Próximo should not reopen the count', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      const { player, cues } = recordingPlayer()
      const { queue } = renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())
      await passSeconds(secondsBefore)
      const cuesBefore = [...cues]

      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })))
      await act(async () => vi.advanceTimersByTimeAsync(300))
      await act(async () => tapNext())

      expect({
        title: screen.getByRole('heading').textContent,
        target: shownOf('Tempo'),
        timers: screen.queryAllByRole('timer').length,
        pendingSets: pendingSetCount(queue),
        newCues: cues.length - cuesBefore.length,
        topControl: ariaDisabled(TOP_CONTROL_ONLY_PRANCHA),
        announced: screen.getByRole('status').textContent,
      }).toEqual({
        title: 'Prancha',
        target: '45 segundos',
        timers: 0,
        pendingSets: 0,
        newCues: 0,
        topControl: 'false',
        announced: 'Prancha, série 1 de 3',
      })
    })
  })
})

function soundSwitch() {
  return screen.getByRole('button', { name: 'Som' })
}

describe('Given the count of prancha with the sound on', () => {
  describe('When the athlete taps Som and lets the execution end', () => {
    it('Then no cue should play, the timer and the record should stay the same, Começou should be announced, and a new screen should open with the sound off', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      const { player, cues } = recordingPlayer()
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())
      cues.length = 0

      fireEvent.click(soundSwitch())
      const pressedAfterTap = soundSwitch().getAttribute('aria-pressed')
      await passSeconds(3)
      const atStart = { clock: executionClock(), announced: screen.getByRole('status').textContent }
      await passSeconds(45)

      cleanup()
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())
      expect({
        pressedAfterTap,
        cues,
        atStart,
        sets: sentBodies(fetchMock).map(({ seconds }) => seconds),
        pressedOnNewScreen: soundSwitch().getAttribute('aria-pressed'),
      }).toEqual({
        pressedAfterTap: 'false',
        cues: [],
        atStart: { clock: '0:45', announced: 'Começou' },
        sets: [45],
        pressedOnNewScreen: 'false',
      })
    })
  })
})

describe('Given a tone player whose play throws', () => {
  describe('When the count runs and the execution begins', () => {
    it('Then the timer should go on and no error should show on screen', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      const failing: TonePlayer = {
        unlock: () => {},
        play: () => {
          throw new Error('no audio')
        },
      }
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, failing)
      await act(async () => tapNext())

      await passSeconds(3)

      expect({ clock: executionClock(), alerts: screen.queryAllByRole('alert').length }).toEqual({
        clock: '0:45',
        alerts: 0,
      })
    })
  })
})

describe('Given the letter B with only prancha, 1 set', () => {
  describe('When the execution reaches zero', () => {
    it('Then should queue 45 s, show Treino concluído with no rest and no dialog, and announce it', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created(), created())
      renderWorkout([{ ...PRANCHA, sets: 1 }])
      await act(async () => tapNext())

      await passSeconds(3 + 45)

      expect({
        sets: sentBodies(fetchMock)
          .filter((body) => 'seconds' in body)
          .map(({ seconds }) => seconds),
        rests: screen.queryAllByRole('timer', { name: 'Descanso' }).length,
        title: screen.getByRole('heading').textContent,
        dialogs: screen.queryAllByRole('dialog').length,
        announced: screen.getByRole('status').textContent,
      }).toEqual({
        sets: [45],
        rests: 0,
        title: 'Treino concluído',
        dialogs: 0,
        announced: 'Série 1 de 1 registrada. Treino concluído',
      })
    })
  })
})

describe('Given an execution of prancha restored after its end passed 40 s ago', () => {
  describe('When the screen mounts', () => {
    it('Then should queue 45 s performed at the end and rest for the 20 s that are left', async () => {
      const running = workoutFlowReducer(
        workoutFlowReducer(flowOf(ONLY_PRANCHA), { type: 'next', nowMs: T0 }),
        { type: 'timerReach', nowMs: T0 + 3000 },
      )
      vi.useFakeTimers({ now: T0 + 88_000 })
      const fetchMock = stubFetch(created())

      await act(async () => {
        renderWorkout(
          ONLY_PRANCHA,
          vi.fn(),
          sendPendingItem,
          restoreWorkoutFlow(running, T0 + 88_000),
        )
      })

      expect({
        sets: sentBodies(fetchMock).map(({ seconds, performedAt }) => ({ seconds, performedAt })),
        rest: restClock(),
      }).toEqual({
        sets: [{ seconds: 45, performedAt: new Date(T0 + 48_000).toISOString() }],
        rest: '0:20',
      })
    })
  })
})

describe('Given the execution of prancha at 0:30 and the screen off for 40 s', () => {
  describe('When the clock jumps and the next tick comes', () => {
    it('Then should queue 45 s, rest for 0:50 and play no late end cue', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      const { player, cues } = recordingPlayer()
      renderWorkout(ONLY_PRANCHA, vi.fn(), sendPendingItem, undefined, player)
      await act(async () => tapNext())
      await passSeconds(3 + 15)

      vi.setSystemTime(T0 + 58_000)
      await act(async () => vi.advanceTimersByTimeAsync(250))

      expect({
        sets: sentBodies(fetchMock).map(({ seconds }) => seconds),
        rest: restClock(),
        endCue: cues.includes('end'),
      }).toEqual({ sets: [45], rest: '0:50', endCue: false })
    })
  })
})

function stubWakeLock() {
  const release = vi.fn(async () => {})
  const request = vi.fn(async () => ({ released: false, release }))
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
  return { request, release }
}

describe('Given the screen of prancha with the wake lock supported', () => {
  describe('When the athlete taps Próximo and the count, the execution and the rest follow', () => {
    it('Then the screen should be asked to stay on once, at the tap, and not again at each passage', async () => {
      vi.useFakeTimers({ now: T0 })
      const { request } = stubWakeLock()
      stubFetch(created())
      renderWorkout(ONLY_PRANCHA)

      await act(async () => tapNext())
      const atTap = request.mock.calls.length
      await passSeconds(3)
      const inExecution = request.mock.calls.length
      await passSeconds(45)

      expect({ atTap, inExecution, inRest: request.mock.calls.length }).toEqual({
        atTap: 1,
        inExecution: 1,
        inRest: 1,
      })
    })
  })
})

describe.each([
  { name: 'the count', secondsBefore: 1 },
  { name: 'the execution', secondsBefore: 3 + 15 },
])('Given the timer of prancha in $name with the wake lock held', ({ secondsBefore }) => {
  describe('When the athlete taps Cancelar', () => {
    it('Then the wake lock should be released', async () => {
      vi.useFakeTimers({ now: T0 })
      const { release } = stubWakeLock()
      stubFetch('pending')
      renderWorkout(ONLY_PRANCHA)
      await act(async () => tapNext())
      await passSeconds(secondsBefore)

      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })))

      expect(release).toHaveBeenCalledTimes(1)
    })
  })
})

// Supino at 40 kg from the program, 3 x 10 resting 90 s (the fixture of the drag adjust spec).
const SUPINO_40 = {
  ...SUPINO_RETO,
  loadG: 40_000,
  plannedLoadG: 40_000,
  loadSource: 'program' as const,
}

function wheelNow(name: string): string | null {
  return screen.getByRole('spinbutton', { name }).getAttribute('aria-valuenow')
}

describe('Given the workout screen on set 1 of supino-reto at 40 kg and 10 reps', () => {
  describe('When it opens', () => {
    it('Then should have the wheels Carga (40) and Repetições (10), no Alvo group and no text field', () => {
      renderWorkout([SUPINO_40, PRANCHA])

      expect({
        load: wheelNow('Carga'),
        reps: wheelNow('Repetições'),
        target: screen.queryByRole('group', { name: 'Alvo' }),
        fields: screen.queryAllByRole('textbox').length + document.querySelectorAll('input').length,
      }).toEqual({ load: '40', reps: '10', target: null, fields: 0 })
    })
  })
})

describe('Given the workout screen on set 1 of prancha at 45 s and 0 kg', () => {
  describe('When it opens', () => {
    it('Then should have the wheels Carga (0) and Tempo (45) and no Repetições', () => {
      renderWorkout([PRANCHA])

      expect({
        load: wheelNow('Carga'),
        time: wheelNow('Tempo'),
        reps: screen.queryByRole('spinbutton', { name: 'Repetições' }),
      }).toEqual({ load: '0', time: '45', reps: null })
    })
  })
})

describe('Given the workout screen resting after set 1 of supino-reto', () => {
  describe('When the rest is on screen', () => {
    it('Then should show no wheel', async () => {
      stubFetch(created())
      renderWorkout([SUPINO_40, PRANCHA])

      await act(async () => tapNext())

      expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    })
  })
})

describe('Given the workout screen of prancha counting down to the execution', () => {
  describe('When the count and then the execution are on screen', () => {
    it('Then should show no wheel in either', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      renderWorkout([PRANCHA])

      await act(async () => tapNext())
      const inCount = screen.queryAllByRole('spinbutton').length
      await act(async () => vi.advanceTimersByTime(3_000))

      expect([inCount, screen.queryAllByRole('spinbutton').length]).toEqual([0, 0])
    })
  })
})

function tapButton(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('Given the buttons of the wheels on set 1 of supino-reto at 40 kg and 10 reps', () => {
  describe('When the athlete taps Aumentar carga twice and Diminuir repetições once, then Próximo', () => {
    it('Then should show 45 kg and 9, queue set 1 with 45000 g and 9 reps and, after the rest, show set 2 with 45 kg and 9', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      renderWorkout([SUPINO_40, PRANCHA])

      tapButton('Aumentar carga')
      tapButton('Aumentar carga')
      tapButton('Diminuir repetições')
      const adjusted = [wheelNow('Carga'), wheelNow('Repetições')]
      await act(async () => tapNext())
      const restWheels = screen.queryAllByRole('spinbutton').length
      await act(async () => vi.advanceTimersByTime(90_000))

      expect({
        adjusted,
        sent: sentBodies(fetchMock).map(({ loadG, reps }) => ({ loadG, reps })),
        restWheels,
        set2: [wheelNow('Carga'), wheelNow('Repetições'), valueTextOf('Séries')],
      }).toEqual({
        adjusted: ['45', '9'],
        sent: [{ loadG: 45_000, reps: 9 }],
        restWheels: 0,
        set2: ['45', '9', '2 de 3'],
      })
    })
  })
})

describe('Given the workout screen on set 1 of supino-reto at 40 kg', () => {
  describe('When the athlete drags the load 22 px down and lets go', () => {
    it('Then should queue no set and stay on set 1 of 3 with 42,5 kg', async () => {
      const fetchMock = stubFetch(created())
      const { queue } = renderWorkout([SUPINO_40, PRANCHA])
      const wheel = screen.getByRole('spinbutton', { name: 'Carga' })

      fireEvent.pointerDown(wheel, { clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(wheel, { clientY: 122, pointerId: 1 })
      fireEvent.pointerUp(wheel, { clientY: 122, pointerId: 1 })

      expect({
        pending: pendingSetCount(queue),
        sent: fetchMock.mock.calls.length,
        title: screen.getByRole('heading', { level: 1 }).textContent,
        sets: valueTextOf('Séries'),
        load: shownOf('Carga'),
      }).toEqual({
        pending: 0,
        sent: 0,
        title: 'Supino reto',
        sets: '1 de 3',
        load: '42,5 quilos',
      })
    })
  })
})

describe('Given the workout screen on set 1 of prancha at 45 s, adjusted to 50 s', () => {
  describe('When the athlete taps Próximo and the count of 3 s ends', () => {
    it('Then the execution should run from 0:50 and, at zero, queue the set with 50 s', async () => {
      vi.useFakeTimers({ now: T0 })
      const fetchMock = stubFetch(created())
      renderWorkout(ONLY_PRANCHA)

      tapButton('Aumentar tempo')
      await act(async () => tapNext())
      await passSeconds(3)
      const inExecution = {
        clock: screen.getByRole('timer', { name: 'Tempo de execução' }).textContent,
        ringTotal: screen
          .getByRole('progressbar', { name: 'Execução restante' })
          .getAttribute('aria-valuemax'),
      }
      await passSeconds(50)

      expect({ inExecution, sent: sentBodies(fetchMock).map(({ seconds }) => seconds) }).toEqual({
        inExecution: { clock: '0:50', ringTotal: '50' },
        sent: [50],
      })
    })
  })
})

describe('Given the screen of supino-reto adjusted to 42,5 kg and 8 reps and not recorded', () => {
  describe('When the saved workout is read and a new screen opens with it restored', () => {
    it('Then the wheels should show 42,5 kg and 8', async () => {
      stubFetch(created())
      renderWorkout([SUPINO_40, PRANCHA])
      tapButton('Aumentar carga')
      tapButton('Diminuir repetições')
      tapButton('Diminuir repetições')
      await waitFor(async () => expect((await loadActiveWorkout(Date.now()))?.draft).not.toBeNull())
      const saved = (await loadActiveWorkout(Date.now())) as WorkoutFlowState
      cleanup()

      renderWorkout(
        [SUPINO_40, PRANCHA],
        vi.fn(),
        NEVER_SENT,
        restoreWorkoutFlow(saved, Date.now()),
      )

      expect([wheelNow('Carga'), wheelNow('Repetições')]).toEqual(['42.5', '8'])
    })
  })
})

// Supino at 45 kg, 3 x 10 resting 90 s: the fixture of the last set correction.
const SUPINO_45 = {
  ...SUPINO_RETO,
  loadG: 45_000,
  plannedLoadG: 45_000,
  loadSource: 'program' as const,
}

const LAST_SET_AT_45 = 'Corrigir última série: 45 quilos, 10 repetições'
const LAST_SET_AT_42_5 = 'Corrigir última série: 42,5 quilos, 10 repetições'

// The polite live region, apart from the indicator of the pending sets, which is also a status.
function liveRegionText(): string | null | undefined {
  return document.querySelector('[aria-live="polite"]')?.textContent
}

// The queue as the athlete cannot see it: the kind and the load of each waiting item.
function queuedLoads(queue: SyncQueue): [string, number][] {
  return queue
    .getSnapshot()
    .pending.flatMap((item) =>
      item.kind === 'set' || item.kind === 'correction' ? [[item.kind, item.body.loadG]] : [],
    )
}

// Taps the button of the last set, lowers the load by one step and taps Salvar.
async function correctLastSetByOneStepDown(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: LAST_SET_AT_45 }))
  const dialog = await screen.findByRole('dialog', { name: 'Corrigir última série' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Diminuir carga' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

describe('Given the rest after set 1 of supino at 45 kg', () => {
  describe('When the athlete opens the correction, lowers the load one step and taps Salvar', () => {
    it('Then the sheet should close, the button should read 42,5 kg with the focus back on it, the live region should announce it, and the queue should hold the set at 45 kg and then the correction at 42,5 kg', async () => {
      const { queue } = renderWorkout([SUPINO_45, PRANCHA], vi.fn(), NEVER_SENT)
      await act(async () => tapNext())
      const buttonBefore = screen.getByRole('button', { name: LAST_SET_AT_45 }).textContent

      await correctLastSetByOneStepDown()

      const button = screen.getByRole('button', { name: LAST_SET_AT_42_5 })
      await waitFor(() => expect(document.activeElement).toBe(button))
      expect({
        buttonBefore,
        button: button.textContent,
        announced: liveRegionText(),
        queued: queuedLoads(queue),
      }).toEqual({
        buttonBefore: '45 kg · 10 rep',
        button: '42,5 kg · 10 rep',
        announced: 'Série corrigida: 42,5 quilos, 10 repetições',
        queued: [
          ['set', 45000],
          ['correction', 42500],
        ],
      })
    })
  })
})

async function openCorrectionSheet(buttonName: string): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: buttonName }))
  const dialog = await screen.findByRole('dialog', { name: 'Corrigir última série' })
  return dialog
}

describe('Given the correction sheet open with the load lowered to 42,5 kg', () => {
  describe('When the athlete taps Cancelar and later opens the sheet again and taps Salvar with no change', () => {
    it('Then the button should keep 45 kg and the queue should hold only the set, after each of the two closings', async () => {
      const { queue } = renderWorkout([SUPINO_45, PRANCHA], vi.fn(), NEVER_SENT)
      await act(async () => tapNext())
      const first = await openCorrectionSheet(LAST_SET_AT_45)
      fireEvent.click(within(first).getByRole('button', { name: 'Diminuir carga' }))

      fireEvent.click(within(first).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      const afterCancel = {
        button: screen.getByRole('button', { name: LAST_SET_AT_45 }).textContent,
        queued: queuedLoads(queue),
      }
      const second = await openCorrectionSheet(LAST_SET_AT_45)
      fireEvent.click(within(second).getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      expect({ afterCancel, afterSave: queuedLoads(queue) }).toEqual({
        afterCancel: { button: '45 kg · 10 rep', queued: [['set', 45000]] },
        afterSave: [['set', 45000]],
      })
    })
  })
})

// Reads by role and label straight from the DOM: a modal sheet over the screen leaves the rest of
// the page aria-hidden, which the role queries skip.
function ariaTextOf(role: string, label: string): string | null | undefined {
  return document
    .querySelector(`[role="${role}"][aria-label="${label}"]`)
    ?.getAttribute('aria-valuetext')
}

describe('Given the correction sheet open in the rest after set 1 of supino at 45 kg', () => {
  describe('When the 90 s of the rest pass and then the athlete lowers the load and taps Salvar', () => {
    it('Then the screen should stay on set 1 while the sheet is open, and show set 2 at 42,5 kg after Salvar', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWorkout([SUPINO_45, PRANCHA], vi.fn(), NEVER_SENT)
      await act(async () => tapNext())
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: LAST_SET_AT_45 }))
      })
      const dialog = screen.getByRole('dialog', { name: 'Corrigir última série' })

      await act(async () => vi.advanceTimersByTimeAsync(95_000))
      const whileOpen = {
        sets: ariaTextOf('progressbar', 'Séries'),
        dialog: screen.queryByRole('dialog') !== null,
      }
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Diminuir carga' }))
      })
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
      })

      expect({
        whileOpen,
        sets: ariaTextOf('progressbar', 'Séries'),
        load: shownOf('Carga'),
      }).toEqual({
        whileOpen: { sets: '1 de 3', dialog: true },
        sets: '2 de 3',
        load: '42,5 quilos',
      })
    })
  })
})

describe('Given the rest after set 1 of supino at 45 kg, corrected more than once', () => {
  describe('When the athlete corrects the set twice, to 42,5 kg and then to 40 kg, and then taps Próximo', () => {
    it('Then the queue should hold the set and one correction at 40 kg, and set 2 should show no correction button', async () => {
      // Only the clock is faked, so the sheet animations still run; Próximo comes after the 0,8 s guard.
      vi.useFakeTimers({ now: T0, toFake: ['Date'] })
      const { queue } = renderWorkout([SUPINO_45, PRANCHA], vi.fn(), NEVER_SENT)
      await act(async () => tapNext())
      const first = await openCorrectionSheet(LAST_SET_AT_45)
      fireEvent.click(within(first).getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(within(first).getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      const second = await openCorrectionSheet(LAST_SET_AT_42_5)
      fireEvent.click(within(second).getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(within(second).getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      vi.setSystemTime(T0 + 2_000)
      await act(async () => tapNext())

      expect({
        queued: queuedLoads(queue),
        correctionButtons: screen.queryAllByRole('button', { name: /^Corrigir última série/ })
          .length,
        sets: screen.getByRole('progressbar', { name: 'Séries' }).getAttribute('aria-valuetext'),
      }).toEqual({
        queued: [
          ['set', 45000],
          ['correction', 40000],
        ],
        correctionButtons: 0,
        sets: '2 de 3',
      })
    })
  })
})

const SUPINO_ONE_SET = { ...SUPINO_45, sets: 1 }
const PRANCHA_ONE_SET = { ...PRANCHA, sets: 1 }

describe('Given the letter of supino 1 x 10 at 45 kg and prancha 1 x 45 s', () => {
  describe('When the athlete corrects supino to 42,5 kg in the rest, then does the prancha up to Treino concluído and corrects it to 40 s', () => {
    it('Then the sequence should list set 1 of supino at 42,5 kg, the finished screen should offer "0 quilos, 45 segundos", and the queue should hold the correction of the prancha after one finish', async () => {
      vi.useFakeTimers({ now: T0, toFake: ['Date'] })
      const { queue } = renderWorkout([SUPINO_ONE_SET, PRANCHA_ONE_SET], vi.fn(), NEVER_SENT)
      await act(async () => tapNext())
      const sheet = await openCorrectionSheet(LAST_SET_AT_45)
      fireEvent.click(within(sheet).getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(within(sheet).getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      const sequence = await openSequence('Sequência do treino, letra A, exercício 2 de 2')
      const supinoSets = within(
        within(sequence).getByRole('list', { name: 'Séries de Supino reto' }),
      )
        .getAllByText(/^Série \d: /)
        .map((node) => node.textContent)
      fireEvent.click(within(sequence).getByRole('button', { name: 'Fechar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      vi.setSystemTime(T0 + 2_000)
      await act(async () => tapNext())
      vi.setSystemTime(T0 + 3_000)
      await act(async () => tapNext())
      vi.setSystemTime(T0 + 6_000)
      await waitFor(() =>
        expect(screen.getByRole('timer', { name: 'Tempo de execução' })).toBeTruthy(),
      )
      vi.setSystemTime(T0 + 52_000)
      await screen.findByRole('heading', { name: 'Treino concluído' })
      const offered = screen.getByRole('button', {
        name: 'Corrigir última série: 0 quilos, 45 segundos',
      }).textContent
      const last = await openCorrectionSheet('Corrigir última série: 0 quilos, 45 segundos')
      fireEvent.click(within(last).getByRole('button', { name: 'Diminuir tempo' }))
      fireEvent.click(within(last).getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      expect({
        supinoSets,
        offered,
        queue: queue.getSnapshot().pending.map(({ kind }) => kind),
        lastCorrection: queue
          .getSnapshot()
          .pending.flatMap((item) =>
            item.kind === 'correction' && 'seconds' in item.body ? [item.body.seconds] : [],
          ),
      }).toEqual({
        supinoSets: ['Série 1: 42,5 kg, 10 repetições'],
        offered: '0 kg · 45 s',
        queue: ['set', 'correction', 'set', 'finish', 'correction'],
        lastCorrection: [40],
      })
    })
  })
})

describe('Given a workout saved in the rest after set 1 of supino corrected to 42,5 kg', () => {
  describe('When a new screen opens from the restored state', () => {
    it('Then should show the button at 42,5 kg with the sheet closed, and queue neither the set nor the correction again', async () => {
      vi.useFakeTimers({ now: T0 + 10_000, toFake: ['Date'] })
      const recorded = workoutFlowReducer(flowOf([SUPINO_45, PRANCHA]), { type: 'next', nowMs: T0 })
      const open = workoutFlowReducer(recorded, { type: 'openSheet', sheet: 'correction' })
      const saved = workoutFlowReducer(open, {
        type: 'correctLastSet',
        values: { loadG: 42500, reps: 10, seconds: null },
        nowMs: T0 + 5_000,
      })
      const restored = restoreWorkoutFlow({ ...saved, sheet: 'correction' }, T0 + 10_000)

      const { queue } = renderWorkout([SUPINO_45, PRANCHA], vi.fn(), NEVER_SENT, restored)
      await act(async () => {})

      expect({
        button: screen.getByRole('button', { name: LAST_SET_AT_42_5 }).textContent,
        dialog: screen.queryByRole('dialog'),
        queued: queue.getSnapshot().pending,
      }).toEqual({ button: '42,5 kg · 10 rep', dialog: null, queued: [] })
    })
  })
})

describe('Given the correction sheet open with the load lowered to 42,5 kg and cancelled', () => {
  describe('When the athlete taps Próximo and set 2 shows', () => {
    it('Then set 2 should still start at 45 kg, since the lowered value was never saved', async () => {
      vi.useFakeTimers({ now: T0, toFake: ['Date'] })
      renderWorkout([SUPINO_45, PRANCHA], vi.fn(), NEVER_SENT)
      await act(async () => tapNext())
      const sheet = await openCorrectionSheet(LAST_SET_AT_45)
      fireEvent.click(within(sheet).getByRole('button', { name: 'Diminuir carga' }))
      fireEvent.click(within(sheet).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      vi.setSystemTime(T0 + 2_000)
      await act(async () => tapNext())

      expect(shownOf('Carga')).toBe('45 quilos')
    })
  })
})

// The segments of the progressbar "Exercícios", read from the DOM: a modal sheet hides the page from roles.
function segmentStatuses(): (string | undefined)[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="progressbar"][aria-label="Exercícios"] [data-status]',
    ),
  ).map((segment) => segment.dataset.status)
}

function dotsOfSets(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[role="progressbar"][aria-label="Séries"] [data-dot]'),
  )
}

describe('Given the top control of the prototype layout', () => {
  describe('When 3 sets of supino-reto are recorded and crucifixo is on screen', () => {
    it('Then the bar should have a segment per exercise: done, current and to do', () => {
      renderWorkout(THREE_EXERCISES, vi.fn(), NEVER_SENT, flowAfterSets(THREE_EXERCISES, 3))

      expect(segmentStatuses()).toEqual(['done', 'current', 'todo'])
    })

    it('Then the list icon should be decorative', () => {
      renderWorkout(THREE_EXERCISES, vi.fn(), NEVER_SENT, flowAfterSets(THREE_EXERCISES, 3))

      expect(
        screen.getByRole('button', { name: TOP_CONTROL_ON_CRUCIFIXO }).querySelector('svg'),
      ).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('When the athlete skips crucifixo in the sequence sheet', () => {
    it('Then its segment should be skipped and triceps-polia should be the current one', async () => {
      vi.useFakeTimers({ now: T0 + 60_000 })
      renderWorkout(THREE_EXERCISES, vi.fn(), NEVER_SENT, flowAfterSets(THREE_EXERCISES, 3))
      const dialog = await openSequence(TOP_CONTROL_ON_CRUCIFIXO)

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Pular Crucifixo' }))
      })
      await act(async () => vi.advanceTimersByTime(500))

      expect(segmentStatuses()).toEqual(['done', 'skipped', 'current'])
    })
  })
})

describe('Given the set screen of the prototype layout', () => {
  describe('When set 1 of supino-reto is on screen', () => {
    it('Then the first dot should be the current one and Próximo should end with a decorative arrow', () => {
      renderWorkout(LETTER_A)

      expect({
        current: dotsOfSets().map((dot) => dot.hasAttribute('data-current')),
        arrow: screen.getByRole('button', { name: 'Próximo' }).querySelector('svg'),
      }).toEqual({
        current: [true, false, false],
        arrow: expect.objectContaining({}),
      })
      expect(screen.getByRole('button', { name: 'Próximo' }).querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
    })
  })
})

describe('Given the rest of the prototype layout', () => {
  describe('When set 1 of supino-reto is recorded and set 2 is next', () => {
    it('Then the dot of set 2 should be the current one', async () => {
      stubFetch('pending')
      renderWorkout(LETTER_A)
      await act(async () => tapNext())

      expect(dotsOfSets().map((dot) => dot.hasAttribute('data-current'))).toEqual([
        false,
        true,
        false,
      ])
    })
  })

  describe('When the last set of supino-reto is recorded and triceps-polia is next', () => {
    it('Then no dot should be current and A seguir should show one hidden dot per set of triceps-polia', async () => {
      vi.useFakeTimers({ now: T0 + 60_000 })
      stubFetch('pending')
      renderWorkout(
        LETTER_A,
        vi.fn(),
        sendPendingItem,
        flowAfterSets(LETTER_A as typeof THREE_EXERCISES, 2),
      )
      await act(async () => tapNext())

      const upNext = screen.getByText('A seguir').closest('p') as HTMLElement
      const miniDots = upNext.querySelector('span[aria-hidden="true"]')
      expect({
        current: dotsOfSets().filter((dot) => dot.hasAttribute('data-current')).length,
        miniDots: miniDots?.children.length,
        name: within(upNext).getByText('Tríceps na polia') !== null,
        heading: screen.getByRole('heading', { level: 1 }).textContent,
      }).toEqual({ current: 0, miniDots: 3, name: true, heading: 'Supino reto' })
    })
  })
})

describe('Given the timed exercise of the prototype layout', () => {
  describe('When the count shows', () => {
    it('Then the screen should have no execution progressbar and the count ring should be decorative', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      renderWorkout(ONLY_PRANCHA)
      await act(async () => tapNext())

      const count = screen.getByRole('timer', { name: 'Contagem para começar' })
      expect({
        progressbar: screen.queryByRole('progressbar', { name: 'Execução restante' }),
        ring: count.parentElement?.querySelector('svg')?.getAttribute('aria-hidden'),
      }).toEqual({ progressbar: null, ring: 'true' })
    })

    it('Then Cancelar should come before Próximo in the same row and Som should sit outside that row', async () => {
      vi.useFakeTimers({ now: T0 })
      stubFetch('pending')
      renderWorkout(ONLY_PRANCHA)
      await act(async () => tapNext())

      const cancel = screen.getByRole('button', { name: 'Cancelar' })
      const next = screen.getByRole('button', { name: 'Próximo' })
      const sound = screen.getByRole('button', { name: 'Som' })
      expect({
        sameRow: cancel.parentElement === next.parentElement,
        order: cancel.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
        soundOutside: !cancel.parentElement?.contains(sound),
        soundIcon: sound.querySelector('svg')?.getAttribute('aria-hidden'),
      }).toEqual({
        sameRow: true,
        order: Node.DOCUMENT_POSITION_FOLLOWING,
        soundOutside: true,
        soundIcon: 'true',
      })
    })
  })
})

function renderWithToast(flow: WorkoutFlowState, exercises = [SUPINO_45, PRANCHA]) {
  const queue = createSyncQueue({ store: createMemoryQueueStore(), send: NEVER_SENT })
  render(
    <ToastProvider>
      <SyncProvider queue={queue}>
        <WorkoutScreen flow={flow} onFinish={vi.fn()} />
      </SyncProvider>
    </ToastProvider>,
  )
  return exercises
}

function floatingToast(): HTMLElement | null {
  return document.querySelector('[data-slot="toast"]')
}

describe('Given the rest after set 1 of supino at 45 kg with a floating toast available', () => {
  async function openAndSave(steps: number) {
    await act(async () => tapNext())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: LAST_SET_AT_45 }))
    })
    const dialog = screen.getByRole('dialog', { name: 'Corrigir última série' })
    for (let step = 0; step < steps; step += 1) {
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Diminuir carga' }))
      })
    }
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    })
  }

  describe('When the athlete lowers the load one step and taps Salvar', () => {
    it('Then the toast should show the new values hidden from the accessibility tree and the live region should announce them', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWithToast(flowOf([SUPINO_45, PRANCHA]))

      await openAndSave(1)

      const toast = floatingToast()
      expect({
        text: toast?.textContent,
        hidden: toast?.closest('[aria-hidden="true"]') !== null,
        inStatus: toast?.closest('[role="status"]') !== null,
        announced: liveRegionText(),
      }).toEqual({
        text: 'Série corrigida: 42,5 kg · 10 rep',
        hidden: true,
        inStatus: false,
        announced: 'Série corrigida: 42,5 quilos, 10 repetições',
      })
    })

    it('Then the toast should leave after the visible time and the exit time', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWithToast(flowOf([SUPINO_45, PRANCHA]))
      await openAndSave(1)

      await act(async () => vi.advanceTimersByTime(TOAST_VISIBLE_MS + TOAST_EXIT_MS))

      expect(floatingToast()).toBeNull()
    })
  })

  describe('When the athlete taps Salvar with no change', () => {
    it('Then the toast should show the same values', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWithToast(flowOf([SUPINO_45, PRANCHA]))

      await openAndSave(0)

      expect(floatingToast()?.textContent).toBe('Série corrigida: 45 kg · 10 rep')
    })
  })

  describe('When the athlete taps Cancelar or presses Escape', () => {
    it('Then no toast should show', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWithToast(flowOf([SUPINO_45, PRANCHA]))
      await act(async () => tapNext())
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: LAST_SET_AT_45 }))
      })
      const dialog = screen.getByRole('dialog', { name: 'Corrigir última série' })
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      })
      await act(async () => vi.advanceTimersByTime(500))
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: LAST_SET_AT_45 }))
      })
      await act(async () => {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      })

      expect(floatingToast()).toBeNull()
    })
  })

  describe('When the workout opens restored with the last step already a correction', () => {
    it('Then no toast should show', () => {
      vi.useFakeTimers({ now: T0 })
      let state = flowOf([SUPINO_45, PRANCHA])
      state = workoutFlowReducer(state, { type: 'next', nowMs: T0 })
      state = workoutFlowReducer(state, { type: 'openSheet', sheet: 'correction' })
      state = workoutFlowReducer(state, {
        type: 'correctLastSet',
        values: { loadG: 42_500, reps: 10, seconds: null },
        nowMs: T0 + 1000,
      })

      renderWithToast(state)

      expect(floatingToast()).toBeNull()
    })
  })

  describe('When the rest ends while the correction sheet is open and the athlete taps Salvar', () => {
    it('Then the toast should show the corrected values over the next set', async () => {
      vi.useFakeTimers({ now: T0 })
      renderWithToast(flowOf([SUPINO_45, PRANCHA]))
      await act(async () => tapNext())
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: LAST_SET_AT_45 }))
      })
      await act(async () => vi.advanceTimersByTimeAsync(95_000))
      const dialog = screen.getByRole('dialog', { name: 'Corrigir última série' })
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Diminuir carga' }))
      })
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }))
      })

      expect(floatingToast()?.textContent).toBe('Série corrigida: 42,5 kg · 10 rep')
    })
  })
})

describe('Given the screen Treino concluído of the prototype layout', () => {
  describe('When the last set of the day is recorded with sets still in the queue', () => {
    async function finishedWithQueue() {
      vi.useFakeTimers({ now: T0 })
      renderWorkout([TRICEPS_TWO_SETS], vi.fn(), NEVER_SENT)
      await tapSets(2)
      await act(async () => vi.advanceTimersByTime(300))
    }

    it('Then Fechar should have no icon and the heading should be the level 1 "Treino concluído"', async () => {
      await finishedWithQueue()

      expect({
        icon: screen.getByRole('button', { name: 'Fechar' }).querySelector('svg'),
        heading: screen.getByRole('heading', { level: 1 }).textContent,
      }).toEqual({ icon: null, heading: 'Treino concluído' })
    })

    it('Then the success mark should be a hidden svg before the heading', async () => {
      await finishedWithQueue()

      const heading = screen.getByRole('heading', { level: 1 })
      const mark = document.querySelector('main svg[aria-hidden="true"]:not(button svg)')
      expect({
        hidden: mark?.getAttribute('aria-hidden'),
        before: (mark?.compareDocumentPosition(heading) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING,
      }).toEqual({ hidden: 'true', before: Node.DOCUMENT_POSITION_FOLLOWING })
    })

    it('Then the screen should have no progressbar "Séries"', async () => {
      await finishedWithQueue()

      expect(screen.queryByRole('progressbar', { name: 'Séries' })).toBeNull()
    })

    it('Then the DOM order should be the last set button, the queue status and Fechar, with the status outside the area of Fechar', async () => {
      await finishedWithQueue()

      const lastSet = screen.getByRole('button', { name: /^Corrigir última série/ })
      const status = screen.getByRole('status', { name: '2 séries aguardando envio' })
      const close = screen.getByRole('button', { name: 'Fechar' })
      const follows = (from: Element, to: Element) =>
        from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING
      expect({
        statusAfterLastSet: follows(lastSet, status),
        closeAfterStatus: follows(status, close),
        statusInsideCloseArea: close.parentElement?.contains(status),
      }).toEqual({
        statusAfterLastSet: Node.DOCUMENT_POSITION_FOLLOWING,
        closeAfterStatus: Node.DOCUMENT_POSITION_FOLLOWING,
        statusInsideCloseArea: false,
      })
    })
  })

  describe('When the day ends with prancha left out and a set in the queue', () => {
    it('Then the region "Ficaram de fora" should come after the status and before Fechar', async () => {
      const { flow, nowMs } = flowOnLastTricepsSetWithPranchaSkipped()
      vi.useFakeTimers({ now: nowMs })
      renderWorkout(SKIP_LETTER, vi.fn(), NEVER_SENT, flow)

      await act(async () => tapNext())
      await act(async () => vi.advanceTimersByTime(300))

      const status = screen.getByRole('status', { name: /aguardando envio/ })
      const region = screen.getByRole('region', { name: 'Ficaram de fora' })
      const close = screen.getByRole('button', { name: 'Fechar' })
      const follows = (from: Element, to: Element) =>
        from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING
      expect({
        regionAfterStatus: follows(status, region),
        closeAfterRegion: follows(region, close),
      }).toEqual({
        regionAfterStatus: Node.DOCUMENT_POSITION_FOLLOWING,
        closeAfterRegion: Node.DOCUMENT_POSITION_FOLLOWING,
      })
    })
  })
})
