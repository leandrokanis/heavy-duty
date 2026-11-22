import { fireEvent, render, screen } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthorizationScreen } from './authorization-screen'

vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))

const useSearchParamsMock = vi.mocked(useSearchParams)

const REQUEST_QUERY =
  'response_type=code&client_id=client-1&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcallback&code_challenge=abc&code_challenge_method=S256&state=xyz'

const APPROVED_REDIRECT = 'https://claude.ai/callback?code=the-code&state=xyz'

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

function stubFetch(...responses: (Response | Error | Promise<Response>)[]) {
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

function stubAssign() {
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
  return assign
}

const CONSENT = { kind: 'consent', clientName: 'Claude', redirectHost: 'claude.ai' }

describe('Given an authorization request whose preview names Claude and claude.ai', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(REQUEST_QUERY) as never)
  })

  describe('When the screen opens', () => {
    it('Then should ask for the preview with the request query and show the host and the declared name', async () => {
      const fetchMock = stubFetch(json(200, CONSENT))
      stubAssign()

      render(<AuthorizationScreen />)

      expect({
        host: (await screen.findByText('claude.ai')) !== null,
        name: screen.getByText('Nome declarado pelo cliente: Claude') !== null,
        previewUrl: fetchMock.mock.calls[0]?.[0],
      }).toEqual({
        host: true,
        name: true,
        previewUrl: `/api/oauth/authorization?${REQUEST_QUERY}`,
      })
    })
  })

  describe('When the PO taps Permitir twice', () => {
    it('Then should send one approve decision and take the browser to redirectTo', async () => {
      let answerDecision: (response: Response) => void = () => {}
      const fetchMock = stubFetch(
        json(200, CONSENT),
        new Promise<Response>((resolve) => {
          answerDecision = resolve
        }),
      )
      const assign = stubAssign()
      render(<AuthorizationScreen />)
      const allow = await screen.findByRole('button', { name: 'Permitir' })

      fireEvent.click(allow)
      fireEvent.click(allow)
      answerDecision(json(200, { redirectTo: APPROVED_REDIRECT }))
      await vi.waitFor(() => expect(assign).toHaveBeenCalled())

      expect({
        decisions: fetchMock.mock.calls.slice(1).map(([url, init]) => ({
          url,
          method: init?.method,
          body: JSON.parse(String(init?.body)),
        })),
        assign: assign.mock.calls,
      }).toEqual({
        decisions: [
          {
            url: '/api/oauth/authorization',
            method: 'POST',
            body: {
              ...Object.fromEntries(new URLSearchParams(REQUEST_QUERY)),
              decision: 'approve',
            },
          },
        ],
        assign: [[APPROVED_REDIRECT]],
      })
    })
  })

  describe('When the consent shows', () => {
    it('Then should offer Recusar before Permitir', async () => {
      stubFetch(json(200, CONSENT))
      stubAssign()

      render(<AuthorizationScreen />)
      await screen.findByRole('button', { name: 'Permitir' })

      expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
        'Recusar',
        'Permitir',
      ])
    })
  })

  describe('When the decision is on its way', () => {
    it('Then should disable both buttons', async () => {
      stubFetch(json(200, CONSENT), new Promise<Response>(() => {}))
      stubAssign()
      render(<AuthorizationScreen />)

      fireEvent.click(await screen.findByRole('button', { name: 'Permitir' }))

      await vi.waitFor(() =>
        expect([
          screen.getByRole('button', { name: 'Recusar' }).hasAttribute('disabled'),
          screen.getByRole('button', { name: 'Permitir' }).hasAttribute('disabled'),
        ]).toEqual([true, true]),
      )
    })
  })

  describe('When the PO taps Recusar', () => {
    it('Then should send the deny decision and take the browser to redirectTo', async () => {
      const deniedRedirect = 'https://claude.ai/callback?error=access_denied&state=xyz'
      const fetchMock = stubFetch(json(200, CONSENT), json(200, { redirectTo: deniedRedirect }))
      const assign = stubAssign()
      render(<AuthorizationScreen />)

      fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
      await vi.waitFor(() => expect(assign).toHaveBeenCalled())

      expect({
        decision: JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).decision,
        assign: assign.mock.calls,
      }).toEqual({ decision: 'deny', assign: [[deniedRedirect]] })
    })
  })
})

describe('Given an authorization request whose redirect_uri the client did not register', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(REQUEST_QUERY) as never)
  })

  describe('When the preview answers 400 oauth_redirect_uri_invalid', () => {
    it('Then should show the message and not redirect', async () => {
      const message = 'Endereço de retorno não registrado por este cliente do MCP.'
      stubFetch(json(400, { code: 'oauth_redirect_uri_invalid', message }))
      const assign = stubAssign()

      render(<AuthorizationScreen />)

      expect({
        shown: (await screen.findByText(message)) !== null,
        allow: screen.queryByRole('button', { name: 'Permitir' }),
        assign: assign.mock.calls,
      }).toEqual({ shown: true, allow: null, assign: [] })
    })
  })
})

describe('Given a refused authorization request', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(REQUEST_QUERY) as never)
  })

  describe('When the refusal shows', () => {
    it('Then the alert should carry the message and a hidden icon', async () => {
      const message = 'Endereço de retorno não registrado por este cliente do MCP.'
      stubFetch(json(400, { code: 'oauth_redirect_uri_invalid', message }))
      stubAssign()

      render(<AuthorizationScreen />)
      const alert = await screen.findByRole('alert')

      expect({
        text: alert.textContent,
        icon: alert.querySelector('svg')?.getAttribute('aria-hidden'),
      }).toEqual({ text: message, icon: 'true' })
    })
  })
})

describe('Given an authorization request without PKCE', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(REQUEST_QUERY) as never)
  })

  describe('When the preview answers error_redirect', () => {
    it('Then should take the browser to redirectTo without asking the PO', async () => {
      const redirectTo = 'https://claude.ai/callback?error=invalid_request&state=xyz'
      stubFetch(json(200, { kind: 'error_redirect', redirectTo }))
      const assign = stubAssign()

      render(<AuthorizationScreen />)
      await vi.waitFor(() => expect(assign).toHaveBeenCalled())

      expect({
        assign: assign.mock.calls,
        allow: screen.queryByRole('button', { name: 'Permitir' }),
      }).toEqual({ assign: [[redirectTo]], allow: null })
    })
  })
})

describe('Given the phone without network', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(REQUEST_QUERY) as never)
  })

  describe('When the preview request fails', () => {
    it('Then should show Sem conexão', async () => {
      stubFetch(new TypeError('Failed to fetch'))
      stubAssign()

      render(<AuthorizationScreen />)

      expect(await screen.findByRole('heading', { name: 'Sem conexão' })).toBeInTheDocument()
    })
  })
})
