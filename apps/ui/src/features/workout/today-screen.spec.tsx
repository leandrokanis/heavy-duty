import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NO_PROGRAM, PRANCHA, SUPINO_RETO, todayBody, todayDay } from './test-today'
import { TodayScreen } from './today-screen'

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: vi.fn(),
}))

function stubFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    fetchMock.mockImplementationOnce(async () => {
      if (response instanceof Error) throw response
      return response
    })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

describe('Given no active program', () => {
  describe('When the athlete opens the app', () => {
    it('Then should show the Heavy Duty title and the empty state that points to Claude', async () => {
      stubFetch(json(200, NO_PROGRAM))

      render(<TodayScreen />)

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

      render(<TodayScreen />)

      expect(await screen.findByText(NO_EXERCISES)).toBeInTheDocument()
    })
  })

  describe('When the program has only letters without exercises', () => {
    it('Then should show the same empty state and no letter button', async () => {
      stubFetch(json(200, todayBody([todayDay('A', 'Superior', [], 0)], null)))

      render(<TodayScreen />)

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

      render(<TodayScreen />)
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

      render(<TodayScreen />)
      await screen.findByRole('button', { name: /^A/ })

      expect(screen.getByRole('main').textContent).toBe('Heavy DutyASuperiorCPernasSugeridaBVazia')
    })
  })
})

async function openLetters(body = LETTERS_ACB) {
  const fetchMock = stubFetch(json(200, body))
  render(<TodayScreen />)
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
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
        exercises: screen
          .getByRole('progressbar', { name: 'Exercícios' })
          .getAttribute('aria-valuetext'),
        sets: screen.getByRole('progressbar', { name: 'Séries' }).getAttribute('aria-valuetext'),
      }).toEqual({
        title: 'Supino reto',
        load: '42,5kg',
        target: '10rep',
        exercises: '1 de 2',
        sets: '1 de 3',
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
        load: screen.getByRole('group', { name: 'Carga' }).textContent,
        target: screen.getByRole('group', { name: 'Alvo' }).textContent,
      }).toEqual({ title: 'Prancha', load: '0kg', target: '45s' })
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

      render(<TodayScreen />)

      expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true')
    })
  })

  describe('When the network fails and the athlete taps Tentar de novo', () => {
    it('Then should show Sem conexão first and the letters after the second request', async () => {
      const fetchMock = stubFetch(new TypeError('Failed to fetch'), json(200, LETTERS_ACB))

      render(<TodayScreen />)
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

      render(<TodayScreen />)

      expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    })
  })
})
