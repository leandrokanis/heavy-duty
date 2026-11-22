import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SignInScreen } from './sign-in-screen'

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startAuthentication: vi.fn(),
}))

const startAuthenticationMock = vi.mocked(startAuthentication)
const supportsMock = vi.mocked(browserSupportsWebAuthn)

const SIGN_IN_FAILED = 'Não foi possível entrar. Tente de novo.'

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Given the sign-in screen in a browser with WebAuthn', () => {
  describe('When it renders', () => {
    it('Then should show the app name and the Entrar button', () => {
      render(<SignInScreen onSignedIn={() => {}} />)

      expect([
        screen.getByRole('heading', { name: 'Heavy Duty' }),
        screen.getByRole('button', { name: 'Entrar' }),
      ]).toHaveLength(2)
    })
  })

  describe('When Entrar is tapped and the passkey is verified', () => {
    it('Then should call onSignedIn', async () => {
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }), json(200))
      startAuthenticationMock.mockResolvedValue({ id: 'credential' } as never)
      const onSignedIn = vi.fn()
      render(<SignInScreen onSignedIn={onSignedIn} />)

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledOnce())
    })
  })

  describe('When Entrar is tapped twice during the ceremony', () => {
    it('Then the button should be disabled and only one ceremony should start', async () => {
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }))
      startAuthenticationMock.mockReturnValue(new Promise(() => {}))
      render(<SignInScreen onSignedIn={() => {}} />)
      const button = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.click(button)
      await vi.waitFor(() => expect(startAuthenticationMock).toHaveBeenCalled())
      fireEvent.click(button)

      expect({
        disabled:
          button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true',
        ceremonies: startAuthenticationMock.mock.calls.length,
      }).toEqual({ disabled: true, ceremonies: 1 })
    })
  })

  describe('When the athlete cancels the confirmation on the phone', () => {
    it('Then should show the sign-in failure message in a live region', async () => {
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }))
      startAuthenticationMock.mockRejectedValue(
        Object.assign(new Error('cancelled'), { name: 'NotAllowedError' }),
      )
      render(<SignInScreen onSignedIn={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      const message = await screen.findByText(SIGN_IN_FAILED)

      expect(message.closest('[aria-live]')).not.toBeNull()
    })
  })

  describe('When the API refuses the passkey with 401', () => {
    it('Then should show the sign-in failure message and not call onSignedIn', async () => {
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }), json(401, { code: 'sign_in_failed' }))
      startAuthenticationMock.mockResolvedValue({ id: 'credential' } as never)
      const onSignedIn = vi.fn()
      render(<SignInScreen onSignedIn={onSignedIn} />)

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      await screen.findByText(SIGN_IN_FAILED)

      expect(onSignedIn).not.toHaveBeenCalled()
    })
  })
})

describe('Given the sign-in screen layout', () => {
  describe('When it opens', () => {
    it('Then should have an empty polite live region and a decorative app icon', () => {
      const { container } = render(<SignInScreen onSignedIn={() => {}} />)
      const region = container.querySelector('[aria-live="polite"]')

      expect({
        regionEmpty: region?.textContent === '',
        decorativeIcons: [...container.querySelectorAll('svg')].every(
          (icon) => icon.getAttribute('aria-hidden') === 'true',
        ),
      }).toEqual({ regionEmpty: true, decorativeIcons: true })
    })
  })

  describe('When the sign-in is refused', () => {
    it('Then the live region should hold only the message, beside a decorative CircleAlert', async () => {
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }), json(401, { code: 'sign_in_failed' }))
      startAuthenticationMock.mockResolvedValue({ id: 'credential' } as never)
      const { container } = render(<SignInScreen onSignedIn={() => {}} />)

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      await screen.findByText(SIGN_IN_FAILED)
      const region = container.querySelector('[aria-live="polite"]')

      expect({
        text: region?.textContent,
        icon: region?.querySelector('svg')?.getAttribute('aria-hidden'),
      }).toEqual({ text: SIGN_IN_FAILED, icon: 'true' })
    })
  })

  describe('When the confirmation is running', () => {
    it('Then the button should keep the name Entrar with the Lock icon outside the name', async () => {
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }))
      startAuthenticationMock.mockReturnValue(new Promise(() => {}))
      render(<SignInScreen onSignedIn={() => {}} />)
      const button = screen.getByRole('button', { name: 'Entrar' })

      fireEvent.click(button)
      await vi.waitFor(() => expect(startAuthenticationMock).toHaveBeenCalled())

      expect({
        name: screen.getByRole('button', { name: 'Entrar' }) === button,
        lockHidden: button.querySelector('svg')?.getAttribute('aria-hidden'),
      }).toEqual({ name: true, lockHidden: 'true' })
    })
  })
})

describe('Given a browser without WebAuthn', () => {
  describe('When the sign-in screen renders', () => {
    it('Then should explain that the browser does not support passkeys, without an enabled button', () => {
      supportsMock.mockReturnValue(false)

      render(<SignInScreen onSignedIn={() => {}} />)
      const button = screen.queryByRole('button', { name: 'Entrar' })

      expect({
        message: screen.getByText('Este navegador não aceita chave de acesso.') !== null,
        enabledButton:
          button !== null &&
          !button.hasAttribute('disabled') &&
          button.getAttribute('aria-disabled') !== 'true',
      }).toEqual({ message: true, enabledButton: false })
    })
  })
})
