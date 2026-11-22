import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SetDots } from './set-dots'

function dotsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-dot]'))
}

describe('Given the SetDots of an exercise with 3 sets', () => {
  describe('When 1 set is recorded and the current one is the second', () => {
    const view = () => render(<SetDots total={3} recorded={1} current={1} />)

    it('Then should draw one dot per set', () => {
      const { container } = view()

      expect(dotsOf(container)).toHaveLength(3)
    })

    it('Then should mark the recorded dot with a check and no number', () => {
      const { container } = view()
      const [done] = dotsOf(container) as [HTMLElement]

      expect({
        recorded: done.getAttribute('data-recorded'),
        check: done.querySelector('svg')?.getAttribute('aria-hidden'),
        text: done.textContent,
      }).toEqual({ recorded: 'true', check: 'true', text: '' })
    })

    it('Then should mark the current dot and show its number', () => {
      const { container } = view()
      const current = dotsOf(container)[1] as HTMLElement

      expect({ current: current.hasAttribute('data-current'), text: current.textContent }).toEqual({
        current: true,
        text: '2',
      })
    })

    it('Then should show the number of the dot still to do', () => {
      const { container } = view()
      const todo = dotsOf(container)[2] as HTMLElement

      expect({ current: todo.hasAttribute('data-current'), text: todo.textContent }).toEqual({
        current: false,
        text: '3',
      })
    })

    it('Then should hide the whole group from the accessibility tree', () => {
      const { container } = view()

      expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('When there is no current set', () => {
    it('Then should mark no dot as current', () => {
      const { container } = render(<SetDots total={3} recorded={1} current={null} />)

      expect(dotsOf(container).filter((dot) => dot.hasAttribute('data-current'))).toHaveLength(0)
    })
  })
})
