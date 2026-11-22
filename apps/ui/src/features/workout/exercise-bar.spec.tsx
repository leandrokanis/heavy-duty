import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExerciseBar } from './exercise-bar'
import type { SequenceItem } from './workout-flow'

const items: SequenceItem[] = [
  {
    exerciseIndex: 0,
    name: 'Supino reto',
    status: 'done',
    setsDone: 3,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 1,
    name: 'Tríceps na polia',
    status: 'current',
    setsDone: 1,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 2,
    name: 'Prancha',
    status: 'skipped',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
  { exerciseIndex: 3, name: 'Remada', status: 'todo', setsDone: 0, setsTotal: 2, recordedSets: [] },
]

function segmentsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-status]'))
}

describe('Given the ExerciseBar of a letter with 4 exercises', () => {
  describe('When the items are drawn', () => {
    it('Then should draw one segment per item, in order, with the status of the item', () => {
      const { container } = render(<ExerciseBar items={items} />)

      expect(segmentsOf(container).map((segment) => segment.dataset.status)).toEqual([
        'done',
        'current',
        'skipped',
        'todo',
      ])
    })

    it('Then should fill each segment with the fraction of sets done', () => {
      const { container } = render(<ExerciseBar items={items} />)

      expect(
        segmentsOf(container).map((segment) => segment.style.getPropertyValue('--filled')),
      ).toEqual(['100%', `${(1 / 3) * 100}%`, '0%', '0%'])
    })

    it('Then should hide the segments from the accessibility tree', () => {
      const { container } = render(<ExerciseBar items={items} />)

      expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
