import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { adjustValue } from './drag-adjust'
import { ValueWheel } from './value-wheel'

function renderLoad(value: number, onAdjust = vi.fn()) {
  render(<ValueWheel field="loadG" label="Carga" value={value} onAdjust={onAdjust} />)
  return onAdjust
}

describe('Given a load wheel at 40000 g', () => {
  describe('When it is on screen', () => {
    it('Then should be a spinbutton named Carga with the value, the minimum and the spoken text', () => {
      renderLoad(40_000)
      const wheel = screen.getByRole('spinbutton', { name: 'Carga' })

      expect({
        now: wheel.getAttribute('aria-valuenow'),
        min: wheel.getAttribute('aria-valuemin'),
        text: wheel.getAttribute('aria-valuetext'),
      }).toEqual({ now: '40', min: '0', text: '40 quilos' })
    })

    it('Then should show 40 kg large, with the label visible', () => {
      renderLoad(40_000)
      const wheel = screen.getByRole('spinbutton', { name: 'Carga' })

      expect([
        within(wheel).getByText('40').getAttribute('aria-hidden'),
        within(wheel).getByText('kg').textContent,
        screen.getByText('Carga').getAttribute('aria-hidden'),
      ]).toEqual([null, 'kg', null])
    })

    it('Then should show 42,5 above and 37,5 below, both hidden from screen readers', () => {
      renderLoad(40_000)

      expect([
        screen.getByText('42,5').getAttribute('aria-hidden'),
        screen.getByText('37,5').getAttribute('aria-hidden'),
      ]).toEqual(['true', 'true'])
    })

    it('Then should have no instruction text, only the label, the values and the unit', () => {
      renderLoad(40_000)
      const wheel = screen.getByRole('spinbutton', { name: 'Carga' })

      expect(wheel.textContent).toBe('42,540kg37,5')
    })
  })
})

describe('Given a load wheel at 0 g', () => {
  describe('When it is on screen', () => {
    it('Then should leave the position below empty', () => {
      renderLoad(0)
      const wheel = screen.getByRole('spinbutton', { name: 'Carga' })

      expect(wheel.textContent).toBe('2,50kg')
    })
  })
})

describe('Given a reps wheel at 1', () => {
  describe('When it is on screen', () => {
    it('Then should speak 1 repetição and show rep as the unit', () => {
      render(<ValueWheel field="reps" label="Repetições" value={1} onAdjust={vi.fn()} />)
      const wheel = screen.getByRole('spinbutton', { name: 'Repetições' })

      expect([wheel.getAttribute('aria-valuetext'), wheel.getAttribute('aria-valuemin')]).toEqual([
        '1 repetição',
        '1',
      ])
    })
  })
})

describe('Given a load wheel at 40000 g and a reps wheel at 10', () => {
  describe('When the athlete taps the buttons', () => {
    it('Then two taps on Aumentar carga should call onAdjust(1) twice', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.click(screen.getByRole('button', { name: 'Aumentar carga' }))
      fireEvent.click(screen.getByRole('button', { name: 'Aumentar carga' }))

      expect(onAdjust.mock.calls).toEqual([[1], [1]])
    })

    it('Then a tap on Diminuir repetições should call onAdjust(-1)', () => {
      const onAdjust = vi.fn()
      render(<ValueWheel field="reps" label="Repetições" value={10} onAdjust={onAdjust} />)

      fireEvent.click(screen.getByRole('button', { name: 'Diminuir repetições' }))

      expect(onAdjust.mock.calls).toEqual([[-1]])
    })
  })
})

describe('Given a load wheel at the minimum of 0 g', () => {
  describe('When the athlete taps Diminuir carga', () => {
    it('Then the button should be aria-disabled, stay focusable and not call onAdjust', () => {
      const onAdjust = renderLoad(0)
      const button = screen.getByRole('button', { name: 'Diminuir carga' })

      button.focus()
      fireEvent.click(button)

      expect({
        disabled: button.getAttribute('aria-disabled'),
        focused: document.activeElement === button,
        calls: onAdjust.mock.calls.length,
      }).toEqual({ disabled: 'true', focused: true, calls: 0 })
    })
  })
})

function totalOf(onAdjust: ReturnType<typeof vi.fn>): number {
  return onAdjust.mock.calls.reduce((sum, [steps]) => sum + steps, 0)
}

function wheelOf() {
  return screen.getByRole('spinbutton', { name: 'Carga' })
}

// A parent with real state, as the reducer keeps it, to see the drag meet the minimum.
function StatefulLoad({ start }: { start: number }) {
  const [value, setValue] = useState(start)
  return (
    <ValueWheel
      field="loadG"
      label="Carga"
      value={value}
      onAdjust={(steps) => setValue((current) => adjustValue('loadG', current, steps))}
    />
  )
}

describe('Given a load wheel with the pointer down at y 100', () => {
  describe('When the pointer moves', () => {
    it('Then 22 px down should adjust by +1', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.pointerDown(wheelOf(), { clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(wheelOf(), { clientY: 122, pointerId: 1 })

      expect(totalOf(onAdjust)).toBe(1)
    })

    it('Then 44 px up should adjust by -2 in total', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.pointerDown(wheelOf(), { clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(wheelOf(), { clientY: 78, pointerId: 1 })
      fireEvent.pointerMove(wheelOf(), { clientY: 56, pointerId: 1 })

      expect(totalOf(onAdjust)).toBe(-2)
    })
  })
})

describe('Given a wheel with a parent that keeps the value, at 1 kg', () => {
  describe('When the pointer goes 66 px up and, without lifting, 22 px down', () => {
    it('Then should reach 0 kg and then 2,5 kg, with no steps lost below the minimum', () => {
      render(<StatefulLoad start={1_000} />)

      fireEvent.pointerDown(wheelOf(), { clientY: 200, pointerId: 1 })
      fireEvent.pointerMove(wheelOf(), { clientY: 134, pointerId: 1 })
      const atMinimum = wheelOf().getAttribute('aria-valuetext')
      fireEvent.pointerMove(wheelOf(), { clientY: 156, pointerId: 1 })

      expect([atMinimum, wheelOf().getAttribute('aria-valuetext')]).toEqual([
        '0 quilos',
        '2,5 quilos',
      ])
    })
  })
})

describe('Given a load wheel with no drag in progress', () => {
  describe('When the pointer moves', () => {
    it('Then should not adjust without a pointer down', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.pointerMove(wheelOf(), { clientY: 200, pointerId: 1 })

      expect(totalOf(onAdjust)).toBe(0)
    })

    it.each([['pointerUp'], ['pointerCancel']] as const)(
      'Then should not adjust after a %s',
      (ending) => {
        const onAdjust = renderLoad(40_000)

        fireEvent.pointerDown(wheelOf(), { clientY: 100, pointerId: 1 })
        fireEvent[ending](wheelOf(), { clientY: 100, pointerId: 1 })
        fireEvent.pointerMove(wheelOf(), { clientY: 200, pointerId: 1 })

        expect(totalOf(onAdjust)).toBe(0)
      },
    )

    it('Then the wheel should not let the page scroll under the finger', () => {
      renderLoad(40_000)

      expect(wheelOf()).toHaveClass('touch-none')
    })
  })
})

describe('Given a load wheel with the focus on it', () => {
  describe('When the athlete presses a key', () => {
    it.each([
      ['ArrowUp', 1],
      ['ArrowRight', 1],
      ['ArrowDown', -1],
      ['ArrowLeft', -1],
    ])('Then %s should adjust by %i and keep the page from scrolling', (key, steps) => {
      const onAdjust = renderLoad(40_000)

      const notPrevented = fireEvent.keyDown(wheelOf(), { key })

      expect([onAdjust.mock.calls, notPrevented]).toEqual([[[steps]], false])
    })

    it('Then Tab should not adjust', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.keyDown(wheelOf(), { key: 'Tab' })

      expect(onAdjust).not.toHaveBeenCalled()
    })
  })
})

describe('Given a load wheel under the mouse', () => {
  describe('When the mouse wheel turns', () => {
    it.each([
      [-40, 1],
      [40, -1],
    ])('Then deltaY %i should adjust by %i and keep the page from scrolling', (deltaY, steps) => {
      const onAdjust = renderLoad(40_000)

      const notPrevented = fireEvent.wheel(wheelOf(), { deltaY })

      expect([onAdjust.mock.calls, notPrevented]).toEqual([[[steps]], false])
    })

    it('Then two events of -20 should add up to one step', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.wheel(wheelOf(), { deltaY: -20 })
      fireEvent.wheel(wheelOf(), { deltaY: -20 })

      expect(totalOf(onAdjust)).toBe(1)
    })

    it('Then a line-mode event of -3 should be one step', () => {
      const onAdjust = renderLoad(40_000)

      fireEvent.wheel(wheelOf(), { deltaY: -3, deltaMode: 1 })

      expect(onAdjust.mock.calls).toEqual([[1]])
    })
  })
})

describe('Given a load wheel in the prototype layout', () => {
  describe('When the athlete taps the buttons', () => {
    it('Then the icons of Diminuir carga and Aumentar carga should be decorative', () => {
      renderLoad(40_000)

      expect(
        ['Diminuir carga', 'Aumentar carga'].map((name) =>
          screen.getByRole('button', { name }).querySelector('svg')?.getAttribute('aria-hidden'),
        ),
      ).toEqual(['true', 'true'])
    })
  })

  describe('When the pointer goes down and moves', () => {
    it('Then the value area should be marked as dragging until the pointer goes up', () => {
      renderLoad(40_000)

      fireEvent.pointerDown(wheelOf(), { clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(wheelOf(), { clientY: 110, pointerId: 1 })
      const during = wheelOf().hasAttribute('data-dragging')
      fireEvent.pointerUp(wheelOf(), { clientY: 110, pointerId: 1 })

      expect({ during, after: wheelOf().hasAttribute('data-dragging') }).toEqual({
        during: true,
        after: false,
      })
    })

    it('Then the drag tint should sit on the faded layer, not on the focusable value area', () => {
      renderLoad(40_000)

      const fadedLayer = wheelOf().firstElementChild
      expect({
        areaTinted: wheelOf().className.includes('accent-soft'),
        fadedLayerTinted: fadedLayer?.className.includes('accent-soft'),
        fadedLayerMasked: fadedLayer?.className.includes('mask-image'),
      }).toEqual({ areaTinted: false, fadedLayerTinted: true, fadedLayerMasked: true })
    })
  })
})
