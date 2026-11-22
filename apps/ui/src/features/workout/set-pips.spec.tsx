import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SetPips } from './set-pips'

describe('Given the SetPips of an exercise with 3 sets and 1 recorded', () => {
  describe('When the pips are drawn', () => {
    it('Then should draw one pip per set', () => {
      const { container } = render(<SetPips total={3} recorded={1} />)

      expect(container.querySelectorAll('[data-pip]')).toHaveLength(3)
    })

    it('Then should mark only the recorded set', () => {
      const { container } = render(<SetPips total={3} recorded={1} />)

      expect(
        Array.from(container.querySelectorAll<HTMLElement>('[data-pip]')).map(
          (pip) => pip.dataset.recorded,
        ),
      ).toEqual(['true', undefined, undefined])
    })

    it('Then should hide the group from the accessibility tree and carry no text', () => {
      const { container } = render(<SetPips total={3} recorded={1} />)

      expect({
        hidden: container.firstElementChild?.getAttribute('aria-hidden'),
        text: container.textContent,
      }).toEqual({ hidden: 'true', text: '' })
    })
  })
})
