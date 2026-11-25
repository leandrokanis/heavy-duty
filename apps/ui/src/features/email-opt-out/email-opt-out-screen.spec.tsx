import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmailOptOutScreen } from './email-opt-out-screen'

function stubLocation(hash: string) {
  vi.stubGlobal('location', { ...window.location, hash })
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Given the link to turn the emails off with a token in the fragment', () => {
  describe('When the page opens', () => {
    it('Then should not call the API before the tap', () => {
      stubLocation('#token=dG9rZW4')
      const fetchMock = stubFetch(new Response(null, { status: 204 }))
      render(<EmailOptOutScreen />)

      expect(screen.getByRole('button', { name: 'Desligar e-mails' })).toBeEnabled()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('Then should say that the phone notices go on', () => {
      stubLocation('#token=dG9rZW4')
      stubFetch(new Response(null, { status: 204 }))
      render(<EmailOptOutScreen />)

      expect(screen.getByText(/Os avisos no celular continuam\./)).toBeInTheDocument()
    })
  })

  describe('When Desligar e-mails is tapped and the API answers 204', () => {
    it('Then should send the token and show that the emails are off', async () => {
      stubLocation('#token=dG9rZW4')
      const fetchMock = stubFetch(new Response(null, { status: 204 }))
      render(<EmailOptOutScreen />)

      fireEvent.click(screen.getByRole('button', { name: 'Desligar e-mails' }))

      expect(await screen.findByRole('heading', { name: 'E-mails desligados' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Desligar e-mails' })).toBeNull()
      expect(fetchMock.mock.calls[0]).toEqual([
        '/api/email/unsubscribe',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'dG9rZW4' }) }),
      ])
    })
  })

  describe('When Desligar e-mails is tapped without signal', () => {
    it('Then should keep the button and ask to try again', async () => {
      stubLocation('#token=dG9rZW4')
      stubFetch(new TypeError('Failed to fetch'))
      render(<EmailOptOutScreen />)

      fireEvent.click(screen.getByRole('button', { name: 'Desligar e-mails' }))

      expect(
        await screen.findByText('Não foi possível desligar os e-mails. Tente de novo.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Desligar e-mails' })).toBeEnabled()
    })
  })
})

describe('Given the link without a token', () => {
  describe('When the page opens', () => {
    it('Then should say the link is invalid, without the button', () => {
      stubLocation('')
      stubFetch(new Response(null, { status: 204 }))
      render(<EmailOptOutScreen />)

      expect(
        screen.getByText('Link de desligar inválido. Abra de novo o link do e-mail.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Desligar e-mails' })).toBeNull()
    })
  })
})
