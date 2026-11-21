import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SequenceSheet } from './sequence-sheet'
import type { SequenceItem } from './workout-flow'

const ALL_DONE: SequenceItem[] = [
  { exerciseIndex: 0, name: 'Supino reto', status: 'done', setsDone: 3, setsTotal: 3 },
  { exerciseIndex: 1, name: 'Tríceps na polia', status: 'done', setsDone: 3, setsTotal: 3 },
]

function renderSheet(items: SequenceItem[], finished: boolean) {
  render(
    <SequenceSheet
      open
      items={items}
      finished={finished}
      returnFocusRef={{ current: null }}
      onClose={vi.fn()}
      onPick={vi.fn()}
      onEnd={vi.fn()}
    />,
  )
}

describe('Given the sequence sheet of a finished workout, with every exercise done', () => {
  describe('When the sheet renders', () => {
    it('Then should have no Encerrar button and no item that leads to an exercise, only the close control', async () => {
      renderSheet(ALL_DONE, true)

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label') ?? button.textContent),
      ).toEqual(['Fechar'])
    })
  })
})

describe('Given the sequence sheet of a workout in progress, with one exercise to do', () => {
  describe('When the sheet renders', () => {
    it('Then should offer the exercise to do as a button, with Encerrar, and the exercise done as plain text', async () => {
      renderSheet(
        [
          { exerciseIndex: 0, name: 'Supino reto', status: 'current', setsDone: 1, setsTotal: 3 },
          { exerciseIndex: 1, name: 'Tríceps na polia', status: 'todo', setsDone: 0, setsTotal: 3 },
        ],
        false,
      )

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label') ?? button.textContent),
      ).toEqual(['Fechar', 'Tríceps na poliaPor fazer0 de 3', 'Encerrar'])
    })
  })
})
