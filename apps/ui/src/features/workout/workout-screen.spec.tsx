import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearActiveWorkout, loadActiveWorkout } from '@/sync/active-workout-store'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SYNC_RETRY_INTERVAL_MS } from '@/sync/sync.config'
import { SyncProvider, sendPendingItem } from '@/sync/sync-context'
import { createSyncQueue, type SendItem, type SyncQueue } from '@/sync/sync-queue'
import { CRUCIFIXO, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'
import { createWorkoutFlow, type WorkoutFlowState, workoutFlowReducer } from './workout-flow'
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
): { queue: SyncQueue } {
  const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
  render(
    <SyncProvider queue={queue}>
      <WorkoutScreen flow={flow} onFinish={onFinish} />
    </SyncProvider>,
  )
  return { queue }
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

// The queue also holds the finish of the workout; this counts the sets only.
function pendingSetCount(queue: SyncQueue): number {
  return queue.getSnapshot().pending.filter(({ kind }) => kind === 'set').length
}

function tapNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
}

afterEach(async () => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'wakeLock')
  await clearActiveWorkout()
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
        resting: screen.queryByRole('timer', { name: 'Descanso' }) !== null,
        next: buttonState('Próximo'),
      }
      outcome = { status: 'confirmed' }
      await act(async () => vi.advanceTimersByTimeAsync(SYNC_RETRY_INTERVAL_MS))

      expect({
        offline,
        indicatorAfter: screen.queryByRole('status', { name: /aguardando envio/ }),
      }).toEqual({
        offline: { indicator: '2 séries aguardando envio', resting: true, next: 'enabled' },
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
        items: within(dialog)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
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
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
        announcement: screen.getByRole('status').textContent,
      }).toEqual({
        afterPick: { dialog: null, clock: '1:20', upNext: true, upNextName: true },
        title: 'Tríceps na polia',
        load: '20kg',
        target: '12rep',
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
        supino: within(reopened).getAllByRole('listitem')[0]?.textContent,
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
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
      }
      const reopened = await openSequence('Sequência do treino, letra A, exercício 2 de 3')
      expect({
        afterSkip,
        items: within(reopened)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      }).toEqual({
        afterSkip: {
          dialog: null,
          focusOnTopControl: true,
          title: 'Tríceps na polia',
          load: '20kg',
          target: '12rep',
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
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
      }).toEqual({ title: 'Prancha', target: '45s' })
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
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
      }).toEqual({
        duringRest: { dialog: null, clock: '1:20', upNext: true, upNextName: true },
        title: 'Tríceps na polia',
        load: '20kg',
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
