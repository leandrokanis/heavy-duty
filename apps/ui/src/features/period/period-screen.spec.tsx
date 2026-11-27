import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { groupLevel } from '@/features/body-map/test-body-map'
import { loadLevels } from '@/sync/levels-cache'
import { loadPeriod } from '@/sync/period-cache'
import { PeriodScreen } from './period-screen'
import { testPeriod } from './test-period'

vi.mock('@/sync/period-cache', () => ({ loadPeriod: vi.fn(), storePeriod: vi.fn() }))
vi.mock('@/sync/levels-cache', () => ({ loadLevels: vi.fn() }))
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: vi.fn(),
}))

const loadPeriodMock = vi.mocked(loadPeriod)
const loadLevelsMock = vi.mocked(loadLevels)
const SAO_PAULO = 'America/Sao_Paulo'
// Wednesday of week 2 of the test period.
const NOW_MS = Date.parse('2026-12-02T15:00:00.000Z')

function stubCopies(period = testPeriod()) {
  loadPeriodMock.mockResolvedValue({ status: 'ok', period })
  loadLevelsMock.mockResolvedValue({
    status: 'ok',
    levels: { now: period.now, groups: [groupLevel('chest'), groupLevel('back')] },
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

describe('Given the current period on the device', () => {
  describe('When the athlete opens the period (US-F11-01)', () => {
    it('Then should show the period, the week of now, the start and the end 12 weeks later', async () => {
      stubCopies()

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      const week = await screen.findByRole('region', { name: 'Semana do período' })
      expect({
        title: screen.getByRole('heading', { level: 1 }).textContent,
        number: screen.getByText('Período 1 · 12 semanas') !== null,
        week: within(week).getByText('Semana 2 de 12') !== null,
        days: within(week).getByText('De 23 de nov. a 14 de fev.') !== null,
      }).toEqual({ title: 'Período', number: true, week: true, days: true })
    })

    it('Then should invite to write the intention', async () => {
      stubCopies()

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      expect(await screen.findByRole('button', { name: 'Escrever a frase' })).toBeInTheDocument()
    })

    it('Then should show the goals of the period against their targets', async () => {
      stubCopies()

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      await screen.findByRole('heading', { name: 'Metas do período' })
      expect([
        screen.getByText('68 %'),
        screen.getByText('Meta do período: 70 %'),
        screen.getByText('+12 %'),
        screen.getByText('Meta do período: +20 %'),
      ]).toHaveLength(4)
    })

    it('Then should list the level of each group', async () => {
      stubCopies()

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      const levels = await screen.findByRole('list', { name: 'Níveis' })
      expect(within(levels).getAllByRole('listitem')).toHaveLength(2)
    })

    it('Then the tab bar should mark the period as the current page', async () => {
      stubCopies()

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      expect(await screen.findByRole('link', { name: 'Período' })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })
  })
})

describe('Given a period with an intention and no goal measured yet', () => {
  describe('When the athlete opens the period', () => {
    it('Then should show the intention, a way to edit it and why each goal is empty', async () => {
      stubCopies(
        testPeriod({
          intention: 'Treinar três vezes por semana.',
          windows: { windowsUsed: 0, windowsMissed: 0, usedPercent: null, targetPercent: 70 },
          volume: {
            baselineVolumeG: null,
            lastWeekVolumeG: null,
            changePercent: null,
            targetPercent: 20,
          },
        }),
      )

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      expect(await screen.findByText('“Treinar três vezes por semana.”')).toBeInTheDocument()
      expect([
        screen.getByRole('button', { name: 'Editar a frase' }),
        screen.getByText('Meta do período: 70 %. Nenhuma janela terminou no período.'),
        screen.getByText('Meta do período: +20 %. Aparece no fim da semana 1.'),
      ]).toHaveLength(3)
    })
  })

  describe('When the athlete taps "Editar a frase"', () => {
    it('Then should open the sheet with the intention', async () => {
      stubCopies(testPeriod({ intention: 'Treinar três vezes por semana.' }))
      render(<PeriodScreen timeZone={SAO_PAULO} />)

      fireEvent.click(await screen.findByRole('button', { name: 'Editar a frase' }))

      expect(await screen.findByRole('textbox', { name: 'Frase de intenção' })).toHaveValue(
        'Treinar três vezes por semana.',
      )
    })
  })
})

describe('Given no signal and no copy of the period', () => {
  describe('When the athlete opens the period', () => {
    it('Then should show the offline notice', async () => {
      loadPeriodMock.mockResolvedValue({ status: 'offline' })
      loadLevelsMock.mockResolvedValue({ status: 'offline' })

      render(<PeriodScreen timeZone={SAO_PAULO} />)

      expect(await screen.findByRole('heading', { name: 'Sem conexão' })).toBeInTheDocument()
    })
  })
})
