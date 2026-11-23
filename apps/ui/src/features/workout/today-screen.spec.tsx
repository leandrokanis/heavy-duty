import { startAuthentication } from '@simplewebauthn/browser'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearActiveWorkout, saveActiveWorkout } from '@/sync/active-workout-store'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider, sendPendingItem } from '@/sync/sync-context'
import { createSyncQueue, type SendItem, type SyncQueue } from '@/sync/sync-queue'
import { pendingSetBody } from '@/sync/test-sets'
import { clearCachedToday, loadToday } from '@/sync/today-cache'
import { clearCachedWindows } from '@/sync/windows-cache'
import { NO_PROGRAM, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayBody, todayDay } from './test-today'
import type { TodayDay } from './today.types'
import { TodayScreen } from './today-screen'
import { createWorkoutFlow, workoutFlowReducer } from './workout-flow'

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: vi.fn(),
}))

// GET /api/windows answers 500 unless a test sets windowsAnswer; it never takes a queued response.
let windowsAnswer: () => Response = () => json(500)

function stubFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    fetchMock.mockImplementationOnce(async () => {
      if (response instanceof Error) throw response
      return response
    })
  }
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    input === '/api/windows' ? Promise.resolve(windowsAnswer()) : fetchMock(input, init),
  )
  return fetchMock
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

// The queue sends through fetch by default, so the stubs of fetch still drive the sends.
function renderToday(send: SendItem = sendPendingItem, queue?: SyncQueue) {
  const ownQueue = queue ?? createSyncQueue({ store: createMemoryQueueStore(), send })
  render(
    <SyncProvider queue={ownQueue}>
      <TodayScreen />
    </SyncProvider>,
  )
  return ownQueue
}

afterEach(async () => {
  windowsAnswer = () => json(500)
  vi.useRealTimers()
  await clearActiveWorkout()
  await clearCachedToday()
  await clearCachedWindows()
})

describe('Given no active program', () => {
  describe('When the athlete opens the app', () => {
    it('Then should show the Heavy Duty title and the empty state that points to Claude', async () => {
      stubFetch(json(200, NO_PROGRAM))

      renderToday()

      expect({
        message: (
          await screen.findByText('Nenhum programa cadastrado. Monte um programa pelo Claude.')
        ).tagName,
        title: screen.getByRole('heading', { level: 1 }).textContent,
      }).toEqual({ message: 'P', title: 'Heavy Duty' })
    })
  })
})

const NO_EXERCISES = 'O programa ativo não tem exercícios. Monte o programa pelo Claude.'

describe('Given an active program without exercises', () => {
  describe('When the program has no letters', () => {
    it('Then should show the empty state of a program without exercises', async () => {
      stubFetch(json(200, todayBody([], null)))

      renderToday()

      expect(await screen.findByText(NO_EXERCISES)).toBeInTheDocument()
    })
  })

  describe('When the program has only letters without exercises', () => {
    it('Then should show the same empty state and no letter button', async () => {
      stubFetch(json(200, todayBody([todayDay('A', 'Superior', [], 0)], null)))

      renderToday()

      expect({
        message: (await screen.findByText(NO_EXERCISES)) !== null,
        buttons: screen.queryAllByRole('button').length,
      }).toEqual({ message: true, buttons: 0 })
    })
  })
})

// Plan order 'A', 'C', 'B' (not alphabetical), 'C' suggested and 'B' without exercises.
const LETTERS_ACB = todayBody(
  [
    todayDay('A', 'Superior', [SUPINO_RETO, PRANCHA]),
    todayDay('C', 'Pernas', [PRANCHA], 315),
    todayDay('B', 'Vazia', [], 0),
  ],
  'C',
)

describe("Given the active program with the letters 'A', 'C' and 'B' in plan order, 'C' suggested and 'B' without exercises", () => {
  describe('When the athlete opens the app', () => {
    it('Then should list the letters as buttons in plan order, with Sugerida only on C and B disabled', async () => {
      stubFetch(json(200, LETTERS_ACB))

      renderToday()
      await screen.findByRole('button', { name: /^A/ })
      const buttons = screen.getAllByRole('button')

      expect({
        order: buttons.map((button) => button.textContent),
        suggested: screen
          .getAllByRole('button', { name: /Sugerida/ })
          .map((button) => button.textContent),
        disabled: buttons.map((button) => button.getAttribute('aria-disabled') === 'true'),
      }).toEqual({
        order: ['ASuperior', 'CPernasSugerida', 'BVazia'],
        suggested: ['CPernasSugerida'],
        disabled: [false, false, true],
      })
    })

    it('Then should show no instruction text', async () => {
      stubFetch(json(200, LETTERS_ACB))

      renderToday()
      await screen.findByRole('button', { name: /^A/ })

      expect(screen.getByRole('main').textContent).toBe('Heavy DutyASuperiorCPernasSugeridaBVazia')
    })
  })
})

async function openLetters(body = LETTERS_ACB) {
  const fetchMock = stubFetch(json(200, body))
  renderToday()
  await screen.findByRole('button', { name: /^A/ })
  return fetchMock
}

describe("Given letter 'A' with supino-reto 3 sets and prancha 3 x 45 s, estimated at 675 s", () => {
  describe("When the athlete taps letter 'A'", () => {
    it('Then a sheet should show the letter, each exercise with its sets, the duration and Começar, with no workout screen yet', async () => {
      await openLetters()

      fireEvent.click(screen.getByRole('button', { name: /^A/ }))
      const sheet = await screen.findByRole('dialog')

      expect({
        title: within(sheet).getByRole('heading').textContent,
        items: within(sheet)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
        duration: within(sheet).getByText('11 min') !== null,
        start: within(sheet).getByRole('button', { name: 'Começar' }) !== null,
        workoutTitle: screen.queryByRole('heading', { level: 1, name: 'Supino reto' }),
      }).toEqual({
        title: 'A Superior',
        items: ['Supino reto3 séries', 'Prancha3 séries'],
        duration: true,
        start: true,
        workoutTitle: null,
      })
    })
  })

  describe("When the athlete taps letter 'B', without exercises", () => {
    it('Then no sheet should open', async () => {
      await openLetters()

      fireEvent.click(screen.getByRole('button', { name: /^B/ }))

      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})

describe("Given the sheet of letter 'A' is open", () => {
  describe('When the athlete taps Fechar', () => {
    it('Then the sheet should close, the letters should stay and only GET requests should have gone out', async () => {
      const fetchMock = await openLetters()
      fireEvent.click(screen.getByRole('button', { name: /^A/ }))
      const sheet = await screen.findByRole('dialog')

      fireEvent.click(within(sheet).getByRole('button', { name: 'Fechar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      expect({
        letters: screen.getAllByRole('button').map((button) => button.textContent),
        methods: fetchMock.mock.calls.map(([, init]) => init?.method ?? 'GET'),
      }).toEqual({
        letters: ['ASuperior', 'CPernasSugerida', 'BVazia'],
        methods: ['GET'],
      })
    })
  })
})

// The value the wheel of a field shows, spoken: the athlete reads it from the wheel.
function shownOf(name: string): string {
  return screen.getByRole('spinbutton', { name }).getAttribute('aria-valuetext') ?? ''
}

async function startLetter(body = LETTERS_ACB, letter = /^A/) {
  await openLetters(body)
  fireEvent.click(screen.getByRole('button', { name: letter }))
  const sheet = await screen.findByRole('dialog')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Começar' }))
  return screen.findByRole('heading', { level: 1 })
}

describe("Given letter 'A' with supino-reto at 42500 g for 10 reps first, then prancha", () => {
  describe('When the athlete taps Começar on the sheet', () => {
    it('Then the workout screen should show supino-reto with 42,5 kg, 10 rep and the progress of exercises and sets', async () => {
      const title = await startLetter()

      expect({
        title: title.textContent,
        load: shownOf('Carga'),
        target: shownOf('Repetições'),
        exercises: screen
          .getByRole('progressbar', { name: 'Exercícios' })
          .getAttribute('aria-valuetext'),
        sets: screen.getByRole('progressbar', { name: 'Séries' }).getAttribute('aria-valuetext'),
      }).toEqual({
        title: 'Supino reto',
        load: '42,5 quilos',
        target: '10 repetições',
        exercises: '1 de 2',
        sets: '1 de 3',
      })
    })
  })
})

describe("Given the workout of the day with letter 'A' of program-1", () => {
  describe('When the athlete taps Começar at 18:30:00 and Próximo at 18:31:05', () => {
    it('Then the set should go to the sets of a v7 workout id with the program, the letter, the start and the tap instant', async () => {
      vi.useFakeTimers({ toFake: ['Date'], now: Date.UTC(2026, 10, 21, 18, 30, 0) })
      const fetchMock = stubFetch(json(200, LETTERS_ACB), json(201))
      renderToday()
      fireEvent.click(await screen.findByRole('button', { name: /^A/ }))
      const sheet = await screen.findByRole('dialog')
      fireEvent.click(within(sheet).getByRole('button', { name: 'Começar' }))
      await screen.findByRole('heading', { level: 1, name: 'Supino reto' })
      vi.setSystemTime(Date.UTC(2026, 10, 21, 18, 31, 5))

      fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
      const body = JSON.parse(init.body as string)

      expect({
        url: /^\/api\/workouts\/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/sets$/.test(
          url,
        ),
        workout: body.workout,
        performedAt: body.performedAt,
      }).toEqual({
        url: true,
        workout: { programId: 'program-1', letter: 'A', startedAt: '2026-11-21T18:30:00.000Z' },
        performedAt: '2026-11-21T18:31:05.000Z',
      })
    })
  })
})

describe("Given letter 'A' with prancha first, 3 x 45 s at 0 g", () => {
  describe('When the athlete starts letter A', () => {
    it('Then the workout screen should show prancha with 0 kg and 45 s', async () => {
      const title = await startLetter(
        todayBody([todayDay('A', 'Core', [PRANCHA, SUPINO_RETO])], 'A'),
      )

      expect({
        title: title.textContent,
        load: shownOf('Carga'),
        target: shownOf('Tempo'),
      }).toEqual({ title: 'Prancha', load: '0 quilos', target: '45 segundos' })
    })
  })
})

describe('Given the workout of the day is being requested', () => {
  describe('When the answer has not arrived yet', () => {
    it('Then the screen should be marked busy', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise<Response>(() => {})),
      )

      renderToday()

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true')
    })
  })

  describe('When the network fails and the athlete taps Tentar de novo', () => {
    it('Then should show Sem conexão first and the letters after the second request', async () => {
      const fetchMock = stubFetch(new TypeError('Failed to fetch'), json(200, LETTERS_ACB))

      renderToday()
      const offline = (await screen.findByRole('heading', { name: 'Sem conexão' })) !== null
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      await screen.findByRole('button', { name: /^A/ })

      expect({ offline, requests: fetchMock.mock.calls.length }).toEqual({
        offline: true,
        requests: 2,
      })
    })
  })

  describe('When the API answers 401', () => {
    it('Then should show the Entrar button of the sign-in screen', async () => {
      stubFetch(json(401, { code: 'unauthenticated' }))

      renderToday()

      expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    })
  })
})

describe("Given letter 'A' with triceps-polia of one set", () => {
  describe('When the athlete starts the letter, taps Próximo with the API answering 201 and then taps Fechar', () => {
    it('Then the workout of the day should be requested again and the letters should show the new answer', async () => {
      const fetchMock = stubFetch(
        json(200, todayBody([todayDay('A', 'Superior', [{ ...TRICEPS_POLIA, sets: 1 }])], 'A')),
        json(201),
        json(200), // the finish of the workout, queued after its only set
        json(200, todayBody([todayDay('B', 'Inferior', [PRANCHA])], 'B')),
      )
      await startLetterFromLoadedMock(/^A/)

      fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Fechar' })).not.toHaveAttribute('data-disabled'),
      )
      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
      await screen.findByRole('button', { name: /^B/ })

      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/today').length).toBe(2)
    })
  })
})

async function startLetterFromLoadedMock(letter: RegExp) {
  renderToday()
  fireEvent.click(await screen.findByRole('button', { name: letter }))
  const sheet = await screen.findByRole('dialog')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Começar' }))
  await screen.findByRole('heading', { level: 1 })
}

const T0 = Date.UTC(2026, 10, 21, 18, 31, 5)

describe('Given an active workout saved resting on supino-reto with 40 s left', () => {
  describe('When the app opens', () => {
    it('Then the rest should show 0:40 for supino-reto', async () => {
      vi.useFakeTimers({ toFake: ['Date'], now: T0 })
      const letterA = todayBody().days[0] as TodayDay
      const resting = workoutFlowReducer(
        createWorkoutFlow({
          workoutId: '0193a1b2-0000-7000-8000-000000000601',
          startedAt: '2026-11-21T18:30:00.000Z',
          programId: 'program-1',
          day: letterA,
        }),
        { type: 'next', nowMs: T0 - 50_000 },
      )
      await saveActiveWorkout(resting, T0 - 50_000)
      stubFetch(json(200, todayBody()))

      renderToday()

      const rest = (await screen.findByRole('timer', { name: 'Descanso' })).textContent
      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        rest,
      }).toEqual({ title: 'Supino reto', rest: '0:40' })
    })
  })
})

describe('Given no connection and a cached today', () => {
  describe('When the app opens', () => {
    it('Then the letters should show the cached values', async () => {
      stubFetch(json(200, LETTERS_ACB))
      await loadToday()
      stubFetch(new TypeError('Failed to fetch'))

      renderToday()

      expect({
        letters: (await screen.findByRole('button', { name: /^A/ })).textContent,
        offline: screen.queryByRole('heading', { name: 'Sem conexão' }),
      }).toEqual({ letters: 'ASuperior', offline: null })
    })
  })
})

describe('Given a set that is still in the queue after failed sends', () => {
  describe('When the workout of the day answers 200', () => {
    it('Then the queue should send again and the indicator should be gone', async () => {
      const send = vi
        .fn<SendItem>()
        .mockResolvedValueOnce({ status: 'retry' }) // the enqueue
        .mockResolvedValueOnce({ status: 'retry' }) // the flush on mount
        .mockResolvedValue({ status: 'confirmed' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
      await queue.enqueue('workout-1', pendingSetBody())
      await queue.flush()
      stubFetch(json(200, LETTERS_ACB))

      renderToday(send, queue)
      await screen.findByRole('button', { name: /^A/ })

      await waitFor(() => expect(send).toHaveBeenCalledTimes(3))
      expect(queue.getSnapshot().pending).toEqual([])
    })
  })
})

describe('Given a set rejected by the API and a pending set in the queue', () => {
  describe('When the letters show', () => {
    it('Then the letters screen should carry the rejected notice and the pending indicator', async () => {
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async ({ id }) =>
          id === 'refused'
            ? {
                status: 'rejected',
                code: 'planned_exercise_not_found',
                message: 'exercício removido',
              }
            : { status: 'retry' },
      })
      await queue.enqueue('workout-1', pendingSetBody({ id: 'refused' }))
      await queue.enqueue('workout-1', pendingSetBody({ id: 'waiting', setNumber: 2 }))
      await queue.flush()
      stubFetch(json(200, LETTERS_ACB))

      renderToday(undefined, queue)
      await screen.findByRole('button', { name: /^A/ })

      expect({
        notice: screen.queryByText('exercício removido') !== null,
        indicator: screen.queryByRole('status', { name: '1 série aguardando envio' }) !== null,
      }).toEqual({ notice: true, indicator: true })
    })
  })
})

describe('Given a set waiting in the queue and the letters of the day', () => {
  describe('When the letters show', () => {
    it('Then the status should come after the heading "Heavy Duty" and before the first letter button', async () => {
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async () => ({ status: 'retry' }),
      })
      await queue.enqueue('workout-1', pendingSetBody({ id: 'waiting' }))
      stubFetch(json(200, LETTERS_ACB))

      renderToday(undefined, queue)
      const firstLetter = await screen.findByRole('button', { name: /^A/ })
      const heading = screen.getByRole('heading', { name: 'Heavy Duty' })
      const status = screen.getByRole('status', { name: '1 série aguardando envio' })

      expect({
        afterHeading: heading.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING,
        beforeLetter:
          status.compareDocumentPosition(firstLetter) & Node.DOCUMENT_POSITION_FOLLOWING,
      }).toEqual({
        afterHeading: Node.DOCUMENT_POSITION_FOLLOWING,
        beforeLetter: Node.DOCUMENT_POSITION_FOLLOWING,
      })
    })
  })
})

describe('Given a set that is still in the queue and an expired session', () => {
  describe('When the athlete signs in and the workout of the day then fails by network', () => {
    it('Then the queue should send the set right after the sign-in', async () => {
      vi.mocked(startAuthentication).mockResolvedValue({ id: 'credential' } as never)
      const send = vi
        .fn<SendItem>()
        .mockResolvedValueOnce({ status: 'retry' }) // the enqueue
        .mockResolvedValueOnce({ status: 'retry' }) // the flush on mount
        .mockResolvedValue({ status: 'confirmed' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
      await queue.enqueue('workout-1', pendingSetBody())
      await queue.flush()
      stubFetch(
        json(401, { code: 'unauthenticated' }),
        json(200, { challenge: 'Y2hhbGxlbmdl' }),
        json(200),
        new TypeError('Failed to fetch'),
      )

      renderToday(send, queue)
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar' }))

      await waitFor(() => expect(queue.getSnapshot().pending).toEqual([]))
    })
  })
})

describe('Given 1 of 2 sets recorded in letter A and the sequence sheet open', () => {
  describe('When the athlete confirms Encerrar', () => {
    it('Then the letters should show again with the workout of the day requested a second time and the new answer', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          calls.push(url)
          if (url === '/api/windows') return json(500)
          if (url !== '/api/today') return json(200)
          const letter = calls.filter((call) => call === '/api/today').length === 1 ? 'A' : 'B'
          return json(
            200,
            todayBody(
              [todayDay(letter, 'Dia', [letter === 'A' ? { ...TRICEPS_POLIA, sets: 2 } : PRANCHA])],
              letter,
            ),
          )
        }),
      )
      await startLetterFromLoadedMock(/^A/)
      fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      fireEvent.click(await screen.findByRole('button', { name: /^Sequência do treino/ }))
      const sequence = await screen.findByRole('dialog')
      fireEvent.click(within(sequence).getByRole('button', { name: 'Encerrar' }))
      fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Encerrar' }),
      )

      await screen.findByRole('button', { name: /^B/ })

      expect({
        today: calls.filter((url) => url === '/api/today').length,
        finishes: calls.filter((url) => url.endsWith('/finish')).length,
      }).toEqual({ today: 2, finishes: 1 })
    })
  })
})

describe('Given the letters of the prototype layout', () => {
  describe('When the letters show', () => {
    it('Then each row should end with a decorative arrow and its name should still begin with the letter', async () => {
      await openLetters()

      const rows = screen.getAllByRole('button')

      expect(
        rows.map((row) => ({
          arrow: row.querySelector('svg')?.getAttribute('aria-hidden'),
          startsWithLetter: /^[ACB]/.test(row.getAttribute('aria-label') ?? row.textContent ?? ''),
        })),
      ).toEqual([
        { arrow: 'true', startsWithLetter: true },
        { arrow: 'true', startsWithLetter: true },
        { arrow: 'true', startsWithLetter: true },
      ])
    })
  })

  describe('When a letter has no name', () => {
    it('Then the button should be named by the letter alone', async () => {
      await openLetters(todayBody([todayDay('A', null, [SUPINO_RETO])], null))

      expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    })
  })

  describe('When the letters are loading', () => {
    it('Then the skeleton should have three rows inside one hidden element', () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise<Response>(() => {})),
      )

      renderToday()
      const skeleton = screen.getByRole('main').querySelector('[aria-hidden="true"]')

      expect(skeleton?.children).toHaveLength(3)
    })
  })

  describe('When the program has no exercises', () => {
    it('Then the whole message should stay in one element', async () => {
      stubFetch(json(200, todayBody([todayDay('A', 'Superior', [], 0)], null)))

      renderToday()

      expect((await screen.findByText(NO_EXERCISES)).textContent).toBe(NO_EXERCISES)
    })
  })
})

describe("Given the sheet of letter 'A' in the prototype layout", () => {
  async function openSheet(body = LETTERS_ACB, letter = /^A/) {
    await openLetters(body)
    fireEvent.click(screen.getByRole('button', { name: letter }))
    return screen.findByRole('dialog')
  }

  describe('When the sheet opens', () => {
    it('Then the dialog should be named by the letter and the name', async () => {
      await openSheet()

      expect(screen.getByRole('dialog', { name: 'A Superior' })).toBeInTheDocument()
    })

    it('Then Fechar and Começar should be the last two buttons, in that order, with only one Fechar', async () => {
      const sheet = await openSheet()
      const buttons = within(sheet).getAllByRole('button')

      expect({
        last: buttons.slice(-2).map((button) => button.textContent),
        closes: within(sheet).getAllByRole('button', { name: 'Fechar' }),
      }).toEqual({ last: ['Fechar', 'Começar'], closes: [buttons.at(-2)] })
    })

    it('Then the clock icon should be decorative', async () => {
      const sheet = await openSheet()

      expect(sheet.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('When the athlete presses Escape', () => {
    it('Then the sheet should close with no POST', async () => {
      const fetchMock = await openLetters()
      fireEvent.click(screen.getByRole('button', { name: /^A/ }))
      await screen.findByRole('dialog')

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      expect(fetchMock.mock.calls.map(([, init]) => init?.method ?? 'GET')).toEqual(['GET'])
    })
  })

  describe('When the letter has no name', () => {
    it('Then the heading and the name of the dialog should be the letter alone', async () => {
      const sheet = await openSheet(todayBody([todayDay('A', null, [SUPINO_RETO])], null))

      expect({
        heading: within(sheet).getByRole('heading').textContent,
        dialog: screen.getByRole('dialog', { name: 'A' }) !== null,
      }).toEqual({ heading: 'A', dialog: true })
    })
  })
})

const WINDOWS_NOW_MS = Date.UTC(2026, 10, 23, 12, 0, 0)

function windowsBody(closesAtMs: number) {
  return {
    now: new Date(WINDOWS_NOW_MS).toISOString(),
    groups: [
      {
        muscleGroup: { slug: 'chest', name: 'peito' },
        state: 'open',
        lastTrainedAt: new Date(WINDOWS_NOW_MS - 86_400_000).toISOString(),
        opensAt: new Date(WINDOWS_NOW_MS - 3_600_000).toISOString(),
        closesAt: new Date(closesAtMs).toISOString(),
      },
    ],
  }
}

describe('Given letter A trains chest, whose window closes in 30 s', () => {
  describe('When the athlete opens the app', () => {
    it('Then letter A should show chest open until the closing', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: WINDOWS_NOW_MS })
      stubFetch(json(200, todayBody()))
      windowsAnswer = () => json(200, windowsBody(WINDOWS_NOW_MS + 30_000))

      renderToday()

      expect(await screen.findByText(/^Peito · fecha hoje/)).toBeInTheDocument()
    })
  })

  describe('When the screen stays open for one minute', () => {
    it('Then chest should turn into cooling without a new request', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: WINDOWS_NOW_MS })
      stubFetch(json(200, todayBody()))
      windowsAnswer = () => json(200, windowsBody(WINDOWS_NOW_MS + 30_000))
      renderToday()
      await screen.findByText(/^Peito · fecha hoje/)

      await act(async () => {
        vi.advanceTimersByTime(60_000)
      })

      expect(screen.getByText('Peito · esfriando há menos de 1 h')).toBeInTheDocument()
    })
  })

  describe('When the windows request fails', () => {
    it('Then the letters should show with no window', async () => {
      stubFetch(json(200, todayBody()))

      renderToday()
      await screen.findByRole('button', { name: /^A/ })

      expect(screen.queryByText(/Peito/)).not.toBeInTheDocument()
    })
  })
})

describe('Given the phone kept the windows of the last opening with network', () => {
  describe('When the athlete opens the app offline', () => {
    it('Then the badges should come from the stored instants and the current time', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: WINDOWS_NOW_MS })
      stubFetch(json(200, todayBody()))
      windowsAnswer = () => json(200, windowsBody(WINDOWS_NOW_MS + 3_600_000))
      renderToday()
      await screen.findByText(/^Peito · fecha hoje/)
      cleanup()
      vi.setSystemTime(WINDOWS_NOW_MS + 5 * 3_600_000)
      stubFetch(json(200, todayBody()))
      windowsAnswer = () => {
        throw new TypeError('Failed to fetch')
      }

      renderToday()

      expect(await screen.findByText('Peito · esfriando há 4 h')).toBeInTheDocument()
    })
  })
})
