import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SUPINO_RETO, todayBody, todayDay } from '@/features/workout/test-today'
import { loadLevels } from '@/sync/levels-cache'
import { loadToday } from '@/sync/today-cache'
import { loadWindows } from '@/sync/windows-cache'
import { BodyMapScreen } from './body-map-screen'
import { groupLevel, groupWindow, NOW_MS, SAO_PAULO } from './test-body-map'

vi.mock('@/sync/windows-cache', () => ({ loadWindows: vi.fn() }))
vi.mock('@/sync/levels-cache', () => ({ loadLevels: vi.fn() }))
vi.mock('@/sync/today-cache', () => ({ loadToday: vi.fn() }))
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: vi.fn(),
}))

const loadWindowsMock = vi.mocked(loadWindows)
const loadLevelsMock = vi.mocked(loadLevels)
const loadTodayMock = vi.mocked(loadToday)

const WINDOWS = {
  now: new Date(NOW_MS).toISOString(),
  groups: [
    groupWindow('chest', { opensIn: -20, closesIn: 83 }),
    groupWindow('back', { opensIn: 0.5, closesIn: 120 }),
    groupWindow('calves', null),
  ],
}

function stubCopies() {
  loadWindowsMock.mockResolvedValue({ status: 'ok', windows: WINDOWS, fromCache: true })
  loadLevelsMock.mockResolvedValue({
    status: 'ok',
    levels: { now: WINDOWS.now, groups: [groupLevel('chest'), groupLevel('back')] },
  })
  loadTodayMock.mockResolvedValue({
    status: 'ok',
    today: todayBody([
      todayDay('A', null, [
        {
          ...SUPINO_RETO,
          muscleGroups: [
            { slug: 'chest', name: 'peito' },
            { slug: 'back', name: 'costas' },
          ],
        },
      ]),
    ]),
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW_MS)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('Given the copies of the windows, the levels and the workout of the day on the device', () => {
  describe('When the athlete opens the map', () => {
    it('Then should show the title, the way back, the legend and a row per group', async () => {
      stubCopies()

      render(<BodyMapScreen timeZone={SAO_PAULO} />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Mapa' })).toBeInTheDocument()
      expect({
        back: screen.getByRole('link', { name: 'Voltar ao treino do dia' }).getAttribute('href'),
        legend: within(screen.getByRole('list', { name: 'Legenda' }))
          .getAllByRole('listitem')
          .map((item) => item.textContent),
        rows: within(screen.getByRole('list', { name: 'Grupos musculares' }))
          .getAllByRole('button')
          .map((row) => row.getAttribute('aria-label')),
      }).toEqual({
        back: '/',
        legend: ['Janela aberta', 'Descansando', 'Esfriando'],
        rows: [
          'Peito, Janela aberta · fecha qui 20h, nível 6',
          'Costas, Descansando · abre hoje 9h30, nível 6',
          'Panturrilhas, Fora do programa',
        ],
      })
    })

    it('Then the tap on a row should open the detail of the group', async () => {
      stubCopies()
      render(<BodyMapScreen timeZone={SAO_PAULO} />)

      fireEvent.click(await screen.findByRole('button', { name: /^Peito/ }))

      expect(await screen.findByRole('dialog', { name: 'Peito' })).toBeInTheDocument()
    })
  })

  describe('When a minute passes and the window of the back opens', () => {
    it('Then the row should follow the clock without a new reading', async () => {
      stubCopies()
      render(<BodyMapScreen timeZone={SAO_PAULO} />)
      await screen.findByRole('button', { name: /^Costas, Descansando/ })

      act(() => {
        vi.advanceTimersByTime(31 * 60_000)
      })

      expect(screen.getByRole('button', { name: /^Costas/ })).toHaveAttribute(
        'aria-label',
        'Costas, Janela aberta · fecha sáb 9h, nível 6',
      )
      expect(loadWindowsMock).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Given no access session', () => {
  describe('When the athlete opens the map', () => {
    it('Then should show the sign in', async () => {
      loadWindowsMock.mockResolvedValue({ status: 'unauthenticated' })
      loadLevelsMock.mockResolvedValue({ status: 'unauthenticated' })
      loadTodayMock.mockResolvedValue({ status: 'unauthenticated' })

      render(<BodyMapScreen timeZone={SAO_PAULO} />)

      expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    })
  })
})

describe('Given no connection and no copy of the windows or the levels', () => {
  describe('When the athlete opens the map and taps "Tentar de novo"', () => {
    it('Then should show "Sem conexão" with the way home and read the copies again', async () => {
      loadWindowsMock.mockResolvedValue({ status: 'offline' })
      loadLevelsMock.mockResolvedValue({ status: 'offline' })
      loadTodayMock.mockResolvedValue({ status: 'offline' })
      render(<BodyMapScreen timeZone={SAO_PAULO} />)

      fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

      await waitFor(() => expect(loadWindowsMock).toHaveBeenCalledTimes(2))
      expect({
        offline: screen.getByRole('heading', { name: 'Sem conexão' }) !== null,
        home: screen.getByRole('button', { name: 'Voltar ao treino do dia' }) !== null,
      }).toEqual({ offline: true, home: true })
    })
  })
})
