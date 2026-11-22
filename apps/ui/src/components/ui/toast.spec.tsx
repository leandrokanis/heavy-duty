import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_EXIT_MS, TOAST_VISIBLE_MS, ToastProvider, useToast } from './toast'

function Trigger({ message, announce }: { message: string; announce?: boolean }) {
  const toast = useToast()
  return (
    <button
      type="button"
      onClick={() => toast.show(message, announce === undefined ? undefined : { announce })}
    >
      {message}
    </button>
  )
}

function press(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

describe('Given a ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('When the app opens and no toast was shown', () => {
    it('Then should already have an empty status region', () => {
      render(
        <ToastProvider>
          <Trigger message="Série corrigida" />
        </ToastProvider>,
      )

      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
  })

  describe('When a toast is shown', () => {
    it('Then should put the text in the status region once', () => {
      render(
        <ToastProvider>
          <Trigger message="Série corrigida" />
        </ToastProvider>,
      )

      press('Série corrigida')

      expect(screen.getByRole('status')).toHaveTextContent(/^Série corrigida$/)
    })

    it('Then should remove the text after the visible time and the exit time', () => {
      render(
        <ToastProvider>
          <Trigger message="Série corrigida" />
        </ToastProvider>,
      )
      press('Série corrigida')

      act(() => {
        vi.advanceTimersByTime(TOAST_VISIBLE_MS + TOAST_EXIT_MS)
      })

      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
  })

  describe('When a second toast is shown while the first is visible', () => {
    it('Then should replace the first text and restart the visible time', () => {
      render(
        <ToastProvider>
          <Trigger message="Primeiro" />
          <Trigger message="Segundo" />
        </ToastProvider>,
      )
      press('Primeiro')
      act(() => {
        vi.advanceTimersByTime(TOAST_VISIBLE_MS - 100)
      })
      press('Segundo')
      act(() => {
        vi.advanceTimersByTime(TOAST_VISIBLE_MS - 100)
      })

      expect(screen.getByRole('status')).toHaveTextContent(/^Segundo$/)
    })
  })
})

describe('Given a toast that is not announced', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const silent = 'Série corrigida: 42,5 kg · 10 rep'

  describe('When it is shown', () => {
    it('Then should leave the status region empty and show the text hidden from the accessibility tree', () => {
      render(
        <ToastProvider>
          <Trigger message={silent} announce={false} />
        </ToastProvider>,
      )

      press(silent)

      const text = screen.getByText(silent, { selector: 'p' })
      expect({
        region: screen.getByRole('status').textContent,
        hidden: text.closest('[aria-hidden="true"]') !== null,
        inRegion: screen.getByRole('status').contains(text),
      }).toEqual({ region: '', hidden: true, inRegion: false })
    })

    it('Then should remove the text after the visible time and the exit time', () => {
      render(
        <ToastProvider>
          <Trigger message={silent} announce={false} />
        </ToastProvider>,
      )
      press(silent)

      act(() => {
        vi.advanceTimersByTime(TOAST_VISIBLE_MS + TOAST_EXIT_MS)
      })

      expect(screen.queryAllByText(silent, { selector: 'p' })).toHaveLength(0)
    })
  })

  describe('When an announced toast follows it', () => {
    it('Then should replace the text and announce the new one', () => {
      render(
        <ToastProvider>
          <Trigger message={silent} announce={false} />
          <Trigger message="Segundo" />
        </ToastProvider>,
      )
      press(silent)
      press('Segundo')

      expect({
        region: screen.getByRole('status').textContent,
        silentLeft: screen.queryAllByText(silent, { selector: 'p' }).length,
      }).toEqual({ region: 'Segundo', silentLeft: 0 })
    })
  })

  describe('When it follows an announced toast', () => {
    it('Then should empty the status region', () => {
      render(
        <ToastProvider>
          <Trigger message="Primeiro" />
          <Trigger message={silent} announce={false} />
        </ToastProvider>,
      )
      press('Primeiro')
      press(silent)

      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
  })
})

describe('Given a component outside the ToastProvider', () => {
  describe('When it calls show', () => {
    it('Then should do nothing and not throw', () => {
      render(<Trigger message="Série corrigida" />)

      expect(() => press('Série corrigida')).not.toThrow()
    })
  })
})
