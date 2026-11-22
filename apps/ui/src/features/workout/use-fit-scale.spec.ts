import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFitScale } from './use-fit-scale'

type Observer = { callback: () => void; observed: Element[] }

function stubResizeObserver(): Observer {
  const observer: Observer = { callback: () => {}, observed: [] }
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        observer.callback = callback
      }
      observe(element: Element) {
        observer.observed.push(element)
      }
      disconnect() {}
    },
  )
  return observer
}

function widthOf(element: HTMLElement, property: 'clientWidth' | 'offsetWidth', value: number) {
  Object.defineProperty(element, property, { configurable: true, value })
}

function mount() {
  const area = document.createElement('div')
  const line = document.createElement('span')
  const hook = renderHook(() => useFitScale())
  act(() => {
    hook.result.current.areaRef.current = area
    hook.result.current.lineRef.current = line
  })
  return { hook, area, line }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Given a value line and its area', () => {
  describe('When the line fits in the area', () => {
    it('Then the scale should be 1', () => {
      const observer = stubResizeObserver()
      const { hook, area, line } = mount()
      widthOf(area, 'clientWidth', 200)
      widthOf(line, 'offsetWidth', 150)

      act(() => observer.callback())

      expect(hook.result.current.scale).toBe(1)
    })
  })

  describe('When the line is wider than the area', () => {
    it('Then the scale should be the area width over the line width', () => {
      const observer = stubResizeObserver()
      const { hook, area, line } = mount()
      widthOf(area, 'clientWidth', 136)
      widthOf(line, 'offsetWidth', 170)

      act(() => observer.callback())

      expect(hook.result.current.scale).toBeCloseTo(0.8)
    })
  })

  describe('When the browser has no ResizeObserver', () => {
    it('Then the scale should stay 1', () => {
      vi.stubGlobal('ResizeObserver', undefined)
      const { hook } = mount()

      expect(hook.result.current.scale).toBe(1)
    })
  })
})
