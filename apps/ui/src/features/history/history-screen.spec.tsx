import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryScreen } from './history-screen'
import { historyExercise, historyWorkout } from './test-history'

vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: vi.fn(),
}))

const useSearchParamsMock = vi.mocked(useSearchParams)

const NOW_MS = Date.parse('2026-11-23T13:00:00.000Z')
const DAY_MS = 86_400_000
const PAGE_MS = 92 * DAY_MS

const OLDER = historyWorkout({
  id: 'w1',
  letter: 'B',
  label: 'Costas',
  startedAt: '2026-11-17T21:45:00.000Z',
})
const NEWER = historyWorkout({
  id: 'w2',
  letter: 'A',
  label: 'Peito',
  startedAt: '2026-11-21T21:30:00.000Z',
  exercises: [historyExercise('Supino reto', [{ loadG: 42_500, reps: 10 }])],
})
const AUGUST = historyWorkout({
  id: 'w0',
  letter: 'C',
  label: 'Pernas',
  startedAt: '2026-08-14T21:30:00.000Z',
})

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

function page(...workouts: unknown[]) {
  return json(200, { workouts })
}

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

function stubParams(query = '') {
  useSearchParamsMock.mockReturnValue(
    new URLSearchParams(query) as unknown as ReturnType<typeof useSearchParams>,
  )
}

function rangeOf(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const url = new URL(String(fetchMock.mock.calls[call]?.[0]), 'http://localhost')
  return {
    path: url.pathname,
    fromMs: Date.parse(url.searchParams.get('from') ?? ''),
    toMs: Date.parse(url.searchParams.get('to') ?? ''),
  }
}

function linkNames(list: HTMLElement) {
  return within(list)
    .getAllByRole('link')
    .map((link) => link.textContent?.slice(0, 2))
}

describe('Given the history screen', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW_MS)
    stubParams()
  })

  describe('When it opens', () => {
    it('Then should ask the last 92 days, ending a day after now', async () => {
      const fetchMock = stubFetch(page())
      render(<HistoryScreen />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
      expect(rangeOf(fetchMock, 0)).toEqual({
        path: '/api/workouts',
        fromMs: NOW_MS + DAY_MS - PAGE_MS,
        toMs: NOW_MS + DAY_MS,
      })
    })

    it('Then should be busy until the API answers', () => {
      stubFetch(page())
      render(<HistoryScreen />)

      expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    })

    it('Then should offer the way back to the workout of the day', () => {
      stubFetch(page())
      render(<HistoryScreen />)

      expect(screen.getByRole('link', { name: 'Voltar ao treino do dia' })).toHaveAttribute(
        'href',
        '/',
      )
    })
  })

  describe('When the API answers the workouts oldest first', () => {
    it('Then should list them newest first', async () => {
      stubFetch(page(OLDER, NEWER))
      render(<HistoryScreen />)

      expect(linkNames(await screen.findByRole('list', { name: 'Treinos' }))).toEqual(['AP', 'BC'])
    })

    it('Then should title the screen Histórico', async () => {
      stubFetch(page(OLDER, NEWER))
      render(<HistoryScreen />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Histórico' })).toBeVisible()
    })
  })

  describe('When no workout started in the last 92 days', () => {
    it('Then should say so', async () => {
      stubFetch(page())
      render(<HistoryScreen />)

      expect(
        await screen.findByText(
          'Nenhum treino nos últimos 92 dias. Os treinos registrados no celular aparecem aqui.',
        ),
      ).toBeInTheDocument()
    })
  })

  describe('When the athlete taps Treinos anteriores', () => {
    it('Then should ask the 92 days before the first page', async () => {
      const fetchMock = stubFetch(page(NEWER), page(AUGUST))
      render(<HistoryScreen />)
      fireEvent.click(await screen.findByRole('button', { name: 'Treinos anteriores' }))

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(rangeOf(fetchMock, 1)).toEqual({
        path: '/api/workouts',
        fromMs: NOW_MS + DAY_MS - 2 * PAGE_MS,
        toMs: NOW_MS + DAY_MS - PAGE_MS,
      })
    })

    it('Then should add the older workouts after the newer ones', async () => {
      stubFetch(page(NEWER), page(AUGUST))
      render(<HistoryScreen />)
      fireEvent.click(await screen.findByRole('button', { name: 'Treinos anteriores' }))

      await waitFor(() =>
        expect(linkNames(screen.getByRole('list', { name: 'Treinos' }))).toEqual(['AP', 'CP']),
      )
    })

    describe('and the older page is empty', () => {
      it('Then should say which days had no workout and keep the button', async () => {
        stubFetch(page(NEWER), page())
        render(<HistoryScreen />)
        fireEvent.click(await screen.findByRole('button', { name: 'Treinos anteriores' }))

        expect(await screen.findByText(/^Nenhum treino de .+ a .+\.$/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Treinos anteriores' })).toBeEnabled()
      })
    })

    describe('and the network fails', () => {
      it('Then should say there is no connection and keep the list', async () => {
        stubFetch(page(NEWER), new TypeError('Failed to fetch'))
        render(<HistoryScreen />)
        fireEvent.click(await screen.findByRole('button', { name: 'Treinos anteriores' }))

        expect(await screen.findByText('Sem conexão. Tente de novo.')).toBeInTheDocument()
        expect(linkNames(screen.getByRole('list', { name: 'Treinos' }))).toEqual(['AP'])
      })
    })
  })

  describe('When the network fails on opening', () => {
    it('Then should show Sem conexão with the retry', async () => {
      stubFetch(new TypeError('Failed to fetch'))
      render(<HistoryScreen />)

      expect(await screen.findByRole('heading', { name: 'Sem conexão' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
    })

    describe('and the athlete taps Tentar de novo', () => {
      it('Then should ask again and list the workouts', async () => {
        stubFetch(new TypeError('Failed to fetch'), page(NEWER))
        render(<HistoryScreen />)
        fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

        expect(linkNames(await screen.findByRole('list', { name: 'Treinos' }))).toEqual(['AP'])
      })
    })
  })

  describe('When the API answers 401', () => {
    it('Then should show the Entrar button of the sign-in screen', async () => {
      stubFetch(json(401, { code: 'unauthenticated' }))
      render(<HistoryScreen />)

      expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    })
  })

  describe('When the address names a loaded workout', () => {
    beforeEach(() => stubParams('treino=w2'))

    it('Then should show its detail', async () => {
      stubFetch(page(OLDER, NEWER))
      render(<HistoryScreen />)

      expect(await screen.findByRole('list', { name: 'Séries de Supino reto' })).toBeVisible()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Peito')
    })

    it('Then should offer the way back to the history', async () => {
      stubFetch(page(OLDER, NEWER))
      render(<HistoryScreen />)

      expect(await screen.findByRole('link', { name: 'Voltar ao histórico' })).toHaveAttribute(
        'href',
        '/historico',
      )
    })
  })

  describe('When the athlete opens a workout from the list', () => {
    it('Then should move the focus to the title of the detail', async () => {
      stubFetch(page(OLDER, NEWER))
      const { rerender } = render(<HistoryScreen />)
      await screen.findByRole('list', { name: 'Treinos' })

      stubParams('treino=w2')
      rerender(<HistoryScreen />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Peito' })).toHaveFocus()
    })
  })

  describe('When the address names a workout that is not loaded', () => {
    it('Then should show the list', async () => {
      stubParams('treino=unknown')
      stubFetch(page(OLDER, NEWER))
      render(<HistoryScreen />)

      expect(await screen.findByRole('list', { name: 'Treinos' })).toBeVisible()
    })
  })
})
