import { startRegistration } from '@simplewebauthn/browser'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EnrollmentScreen } from './enrollment-screen'

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(),
}))

const startRegistrationMock = vi.mocked(startRegistration)

const LINK_INVALID = 'Link de cadastro inválido ou vencido. Gere outro link no servidor.'

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

function stubLocation(hash: string) {
  const replace = vi.fn()
  vi.stubGlobal('location', { ...window.location, hash, replace })
  return replace
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Given the enrollment link with a token in the fragment', () => {
  describe('When Criar chave de acesso is tapped and the enrollment answers 201', () => {
    it('Then should send the token and replace the URL with /, without the fragment', async () => {
      const replace = stubLocation('#token=dG9rZW4tZnJvbS10aGUtbGluaw')
      const fetchMock = stubFetch(
        json(200, { challenge: 'Y2hhbGxlbmdl' }),
        json(201, { expiresAt: '2026-12-21T12:00:00.000Z' }),
      )
      startRegistrationMock.mockResolvedValue({ id: 'credential' } as never)
      render(<EnrollmentScreen />)

      fireEvent.click(screen.getByRole('button', { name: 'Criar chave de acesso' }))
      await vi.waitFor(() => expect(replace).toHaveBeenCalled())

      expect({
        replace: replace.mock.calls,
        optionsBody: JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
      }).toEqual({ replace: [['/']], optionsBody: { token: 'dG9rZW4tZnJvbS10aGUtbGluaw' } })
    })
  })

  describe('When the API answers 400 enrollment_token_invalid', () => {
    it('Then should show the invalid link message', async () => {
      stubLocation('#token=dXNlZC10b2tlbg')
      stubFetch(json(400, { code: 'enrollment_token_invalid', message: LINK_INVALID }))
      render(<EnrollmentScreen />)

      fireEvent.click(screen.getByRole('button', { name: 'Criar chave de acesso' }))

      expect(await screen.findByText(LINK_INVALID)).toBeInTheDocument()
    })
  })

  describe('When Criar chave de acesso is tapped twice during the ceremony', () => {
    it('Then the button should be disabled and only one ceremony should start', async () => {
      stubLocation('#token=dG9rZW4')
      stubFetch(json(200, { challenge: 'Y2hhbGxlbmdl' }))
      startRegistrationMock.mockReturnValue(new Promise(() => {}))
      render(<EnrollmentScreen />)
      const button = screen.getByRole('button', { name: 'Criar chave de acesso' })

      fireEvent.click(button)
      await vi.waitFor(() => expect(startRegistrationMock).toHaveBeenCalled())
      fireEvent.click(button)

      expect({
        disabled: button.hasAttribute('disabled'),
        ceremonies: startRegistrationMock.mock.calls.length,
      }).toEqual({ disabled: true, ceremonies: 1 })
    })
  })
})

describe('Given the enrollment page without a token in the fragment', () => {
  describe('When it renders', () => {
    it('Then should show the invalid link message', () => {
      stubLocation('')

      render(<EnrollmentScreen />)

      expect(screen.getByText(LINK_INVALID)).toBeInTheDocument()
    })
  })
})
