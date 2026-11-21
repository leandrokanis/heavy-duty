import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
