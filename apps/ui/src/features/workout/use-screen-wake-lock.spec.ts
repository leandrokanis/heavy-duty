import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScreenWakeLock } from './use-screen-wake-lock'

type FakeSentinel = { released: boolean; release: ReturnType<typeof vi.fn> }

function stubWakeLock() {
  const sentinels: FakeSentinel[] = []
  const request = vi.fn(async () => {
    const sentinel: FakeSentinel = { released: false, release: vi.fn(async () => {}) }
    sentinels.push(sentinel)
    return sentinel
  })
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
  return { request, sentinels }
}

function showDocument() {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('Given a browser with the Screen Wake Lock API', () => {
  describe('When active turns true', () => {
    it("Then should request the 'screen' lock once", () => {
      const { request } = stubWakeLock()

      renderHook(({ active }) => useScreenWakeLock(active), { initialProps: { active: true } })

      expect(request.mock.calls).toEqual([['screen']])
    })
  })

  describe('When active turns false after the lock was granted', () => {
    it('Then should release the lock', async () => {
      const { sentinels } = stubWakeLock()
      const { rerender } = renderHook(({ active }) => useScreenWakeLock(active), {
        initialProps: { active: true },
      })
      await act(async () => {})

      rerender({ active: false })

      expect(sentinels[0]?.release).toHaveBeenCalledTimes(1)
    })
  })

  describe('When the browser released the lock while hidden and the document turns visible again', () => {
    it('Then should request the lock again', async () => {
      const { request, sentinels } = stubWakeLock()
      renderHook(({ active }) => useScreenWakeLock(active), { initialProps: { active: true } })
      await act(async () => {})
      ;(sentinels[0] as FakeSentinel).released = true

      await act(async () => showDocument())

      expect(request).toHaveBeenCalledTimes(2)
    })
  })
})

describe('Given a browser that grants the lock only after a while', () => {
  describe('When active turns false before the lock is granted', () => {
    it('Then the late lock should be released', async () => {
      const { sentinels } = stubWakeLock()
      const { rerender } = renderHook(({ active }) => useScreenWakeLock(active), {
        initialProps: { active: true },
      })

      rerender({ active: false })
      await act(async () => {})

      expect(sentinels[0]?.release).toHaveBeenCalledTimes(1)
    })
  })

  describe('When the screen unmounts while the lock is held', () => {
    it('Then the lock should be released', async () => {
      const { sentinels } = stubWakeLock()
      const { unmount } = renderHook(({ active }) => useScreenWakeLock(active), {
        initialProps: { active: true },
      })
      await act(async () => {})

      unmount()

      expect(sentinels[0]?.release).toHaveBeenCalledTimes(1)
    })
  })
})

describe.each([
  { browser: 'a browser without the Screen Wake Lock API', stub: () => {} },
  {
    browser: 'a browser that refuses the lock',
    stub: () =>
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: vi.fn(async () => Promise.reject(new DOMException('', 'NotAllowedError'))),
        },
        configurable: true,
      }),
  },
])('Given $browser', ({ stub }) => {
  describe('When active turns true and then false', () => {
    it('Then should not throw nor leave an unhandled rejection', async () => {
      stub()
      const unhandled = vi.fn()
      process.on('unhandledRejection', unhandled)

      const run = async () => {
        const { rerender } = renderHook(({ active }) => useScreenWakeLock(active), {
          initialProps: { active: true },
        })
        await act(async () => {})
        rerender({ active: false })
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      await expect(run()).resolves.toBeUndefined()
      process.off('unhandledRejection', unhandled)
      expect(unhandled).not.toHaveBeenCalled()
    })
  })
})
