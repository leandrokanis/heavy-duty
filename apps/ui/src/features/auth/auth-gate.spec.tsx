import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayBody } from '@/features/workout/test-today'
import { clearCachedToday, loadToday } from '@/sync/today-cache'
import { AuthGate } from './auth-gate'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: vi.fn(async () => ({ id: 'credential', response: {} })),
}))

const usePathnameMock = vi.mocked(usePathname)

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

async function cacheToday() {
  stubFetch(json(200, todayBody()))
  await loadToday()
}

afterEach(async () => {
  await clearCachedToday()
})

function renderGate() {
  return render(
    <AuthGate>
      <h1>Tela pedida</h1>
    </AuthGate>,
  )
}

describe('Given the AuthGate on the home page', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/')
  })

  describe('When the session check answers 401', () => {
    it('Then should show the Entrar button and not the requested screen', async () => {
      stubFetch(json(401))

      renderGate()

      expect({
        signIn: (await screen.findByRole('button', { name: 'Entrar' })) !== null,
        child: screen.queryByRole('heading', { name: 'Tela pedida' }),
      }).toEqual({ signIn: true, child: null })
    })
  })

  describe('When the session check answers 200', () => {
    it('Then should show the requested screen', async () => {
      stubFetch(json(200, { expiresAt: '2026-12-21T12:00:00.000Z' }))

      renderGate()

      expect(await screen.findByRole('heading', { name: 'Tela pedida' })).toBeInTheDocument()
    })
  })

  describe('When the session check fails for the network', () => {
    it('Then should show Sem conexão and not the requested screen', async () => {
      stubFetch(new TypeError('Failed to fetch'))

      renderGate()

      expect({
        offline: (await screen.findByRole('heading', { name: 'Sem conexão' })) !== null,
        child: screen.queryByRole('heading', { name: 'Tela pedida' }),
      }).toEqual({ offline: true, child: null })
    })
  })

  describe('When the session check has not answered yet', () => {
    it('Then should not show the requested screen', () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise(() => {})),
      )

      renderGate()

      expect(screen.queryByRole('heading', { name: 'Tela pedida' })).toBeNull()
    })
  })

  describe('When the athlete signs in from the sign-in screen', () => {
    it('Then should show the requested screen at the same URL', async () => {
      stubFetch(json(401), json(200, { challenge: 'Y2hhbGxlbmdl' }), json(200))
      renderGate()

      fireEvent.click(await screen.findByRole('button', { name: 'Entrar' }))

      expect(await screen.findByRole('heading', { name: 'Tela pedida' })).toBeInTheDocument()
    })
  })
})

describe.each(['/cadastro', '/~offline'])('Given the AuthGate on %s', (path) => {
  describe('When it renders', () => {
    it('Then should show the screen without checking the session', () => {
      usePathnameMock.mockReturnValue(path)
      const fetchMock = stubFetch()

      renderGate()

      expect({
        child: screen.getByRole('heading', { name: 'Tela pedida' }) !== null,
        requests: fetchMock.mock.calls.length,
      }).toEqual({ child: true, requests: 0 })
    })
  })
})

describe('Given the AuthGate on the MCP authorization screen', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/autorizar')
  })

  describe('When the session check answers 401', () => {
    it('Then should show the Entrar button in place of the authorization screen', async () => {
      stubFetch(json(401))

      renderGate()

      expect({
        signIn: (await screen.findByRole('button', { name: 'Entrar' })) !== null,
        child: screen.queryByRole('heading', { name: 'Tela pedida' }),
      }).toEqual({ signIn: true, child: null })
    })
  })
})

describe('Given a cached today on the device', () => {
  describe('When the session check fails for the network on the home page', () => {
    it('Then should show the requested screen', async () => {
      usePathnameMock.mockReturnValue('/')
      await cacheToday()
      stubFetch(new TypeError('Failed to fetch'))

      renderGate()

      expect(await screen.findByRole('heading', { name: 'Tela pedida' })).toBeInTheDocument()
    })
  })

  describe('When the session check fails for the network on another path', () => {
    it('Then should show Sem conexão and not the requested screen', async () => {
      usePathnameMock.mockReturnValue('/autorizar')
      await cacheToday()
      stubFetch(new TypeError('Failed to fetch'))

      renderGate()

      expect({
        offline: (await screen.findByRole('heading', { name: 'Sem conexão' })) !== null,
        child: screen.queryByRole('heading', { name: 'Tela pedida' }),
      }).toEqual({ offline: true, child: null })
    })
  })

  describe('When the session check answers 401 on the home page', () => {
    it('Then should show the Entrar button and not the requested screen', async () => {
      usePathnameMock.mockReturnValue('/')
      await cacheToday()
      stubFetch(json(401))

      renderGate()

      expect({
        signIn: (await screen.findByRole('button', { name: 'Entrar' })) !== null,
        child: screen.queryByRole('heading', { name: 'Tela pedida' }),
      }).toEqual({ signIn: true, child: null })
    })
  })
})

describe('Given no cached today', () => {
  describe('When the session check fails for the network on the home page', () => {
    it('Then should show Sem conexão, without flashing the requested screen while it reads the device', async () => {
      usePathnameMock.mockReturnValue('/')
      stubFetch(new TypeError('Failed to fetch'))

      renderGate()

      expect({
        offline: (await screen.findByRole('heading', { name: 'Sem conexão' })) !== null,
        child: screen.queryByRole('heading', { name: 'Tela pedida' }),
      }).toEqual({ offline: true, child: null })
    })
  })
})

describe('Given the AuthGate on the history', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/historico')
  })

  describe('When the session check fails for the network', () => {
    it('Then should offer the way back to the workout of the day', async () => {
      const assign = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign })
      stubFetch(new TypeError('Failed to fetch'))

      renderGate()
      fireEvent.click(await screen.findByRole('button', { name: 'Voltar ao treino do dia' }))

      expect(assign).toHaveBeenCalledWith('/')
    })
  })
})

describe('Given the AuthGate on the home page without signal and without a cached today', () => {
  describe('When it shows Sem conexão', () => {
    it('Then should not offer a way back to the screen already asked', async () => {
      usePathnameMock.mockReturnValue('/')
      stubFetch(new TypeError('Failed to fetch'))

      renderGate()
      await screen.findByRole('heading', { name: 'Sem conexão' })

      expect(screen.queryByRole('button', { name: 'Voltar ao treino do dia' })).toBeNull()
    })
  })
})
