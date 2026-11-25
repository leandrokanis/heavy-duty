import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BodyFigure } from './body-figure'
import type { BodyMapGroup } from './body-map'
import { NOW_MS } from './test-body-map'

function group(slug: string, state: BodyMapGroup['state'], inProgram = true): BodyMapGroup {
  return {
    slug,
    name: slug,
    state,
    inProgram,
    opensAtMs: NOW_MS,
    closesAtMs: NOW_MS,
    lastTrainedAtMs: NOW_MS,
    level: null,
  }
}

const GROUPS = [
  group('chest', 'open'),
  group('back', 'resting'),
  group('quadriceps', 'cooling'),
  group('abs', 'none'),
  group('calves', 'open', false),
]

function statesOf(container: HTMLElement, slug: string): string[] {
  return [...container.querySelectorAll(`[data-group="${slug}"]`)].map(
    (part) => part.getAttribute('data-state') ?? '',
  )
}

describe('Given chest open, back resting, quadriceps cooling, abs never trained and calves out of the program', () => {
  describe('When the figure is drawn', () => {
    it('Then each part should take the state of its group, neutral when never trained or out of the program', () => {
      const { container } = render(
        <BodyFigure groups={GROUPS} selectedSlug={null} onSelect={vi.fn()} />,
      )

      expect({
        chest: statesOf(container, 'chest'),
        back: statesOf(container, 'back'),
        quadriceps: statesOf(container, 'quadriceps'),
        abs: statesOf(container, 'abs'),
        calves: statesOf(container, 'calves'),
      }).toEqual({
        chest: ['open'],
        back: ['resting'],
        quadriceps: ['cooling', 'cooling'],
        abs: ['neutral'],
        calves: ['neutral', 'neutral'],
      })
    })

    it('Then a cooling part should be filled with the hatch, not with a flat colour', () => {
      const { container } = render(
        <BodyFigure groups={GROUPS} selectedSlug={null} onSelect={vi.fn()} />,
      )

      const fill = container.querySelector('[data-group="quadriceps"]')?.getAttribute('fill') ?? ''
      const patternId = container.querySelector('pattern')?.id

      expect(fill).toBe(`url(#${patternId})`)
    })

    it('Then the figure should stay out of the accessibility tree, as the list says the same', () => {
      const { container } = render(
        <BodyFigure groups={GROUPS} selectedSlug={null} onSelect={vi.fn()} />,
      )

      expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('When the athlete taps the chest on the figure', () => {
    it('Then should select the chest', () => {
      const onSelect = vi.fn()
      const { container } = render(
        <BodyFigure groups={GROUPS} selectedSlug={null} onSelect={onSelect} />,
      )

      fireEvent.click(container.querySelector('[data-group="chest"]') as Element)

      expect(onSelect).toHaveBeenCalledWith('chest')
    })
  })

  describe('When the chest is the selected group', () => {
    it('Then only the parts of the chest should be marked as selected', () => {
      const { container } = render(
        <BodyFigure groups={GROUPS} selectedSlug="chest" onSelect={vi.fn()} />,
      )

      expect(
        [...container.querySelectorAll('[data-selected]')].map((part) =>
          part.getAttribute('data-group'),
        ),
      ).toEqual(['chest'])
    })
  })
})
