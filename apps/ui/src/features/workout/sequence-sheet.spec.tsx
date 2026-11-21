import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SequenceSheet } from './sequence-sheet'
import type { SequenceItem } from './workout-flow'

const ALL_DONE: SequenceItem[] = [
  { exerciseIndex: 0, name: 'Supino reto', status: 'done', setsDone: 3, setsTotal: 3 },
  { exerciseIndex: 1, name: 'Tríceps na polia', status: 'done', setsDone: 3, setsTotal: 3 },
]

type Handlers = { onPick?: () => void; onSkip?: () => void }

function renderSheet(
  items: SequenceItem[],
  finished: boolean,
  canSkip = false,
  { onPick = vi.fn(), onSkip = vi.fn() }: Handlers = {},
) {
  render(
    <SequenceSheet
      open
      items={items}
      finished={finished}
      canSkip={canSkip}
      returnFocusRef={{ current: null }}
      onClose={vi.fn()}
      onPick={onPick}
      onSkip={onSkip}
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

const WITH_PRANCHA_CURRENT: SequenceItem[] = [
  { exerciseIndex: 0, name: 'Supino reto', status: 'done', setsDone: 3, setsTotal: 3 },
  { exerciseIndex: 1, name: 'Prancha', status: 'current', setsDone: 0, setsTotal: 3 },
  { exerciseIndex: 2, name: 'Tríceps na polia', status: 'todo', setsDone: 0, setsTotal: 3 },
]

describe('Given a sequence with prancha as the current exercise and canSkip true', () => {
  describe('When the sheet renders and the athlete taps "Pular Prancha"', () => {
    it('Then should call onSkip once', async () => {
      const onSkip = vi.fn()
      renderSheet(WITH_PRANCHA_CURRENT, false, true, { onSkip })

      fireEvent.click(await screen.findByRole('button', { name: 'Pular Prancha' }))

      expect(onSkip).toHaveBeenCalledTimes(1)
    })
  })
})

describe.each([
  { name: 'canSkip false', finished: false, canSkip: false },
  { name: 'a finished workout', finished: true, canSkip: true },
])('Given a sequence with prancha as the current exercise and $name', ({ finished, canSkip }) => {
  describe('When the sheet renders', () => {
    it('Then should have no Pular button', async () => {
      renderSheet(WITH_PRANCHA_CURRENT, finished, canSkip)

      await screen.findByRole('dialog')
      expect(screen.queryByRole('button', { name: /^Pular/ })).toBeNull()
    })
  })
})

describe('Given a sequence with prancha as the current exercise, canSkip false and the workout in progress', () => {
  describe('When the sheet renders', () => {
    it('Then should still offer Encerrar', async () => {
      renderSheet(WITH_PRANCHA_CURRENT, false, false)

      expect(await screen.findByRole('button', { name: 'Encerrar' })).toBeTruthy()
    })
  })
})

describe('Given a sequence with prancha skipped', () => {
  const skipped: SequenceItem[] = [
    { exerciseIndex: 0, name: 'Supino reto', status: 'done', setsDone: 3, setsTotal: 3 },
    { exerciseIndex: 1, name: 'Prancha', status: 'skipped', setsDone: 0, setsTotal: 3 },
    { exerciseIndex: 2, name: 'Tríceps na polia', status: 'current', setsDone: 0, setsTotal: 3 },
  ]

  describe('When the sheet renders and the athlete taps the row of prancha', () => {
    it('Then the row should read "Pulado" and "0 de 3" in text and call onPick', async () => {
      const onPick = vi.fn()
      renderSheet(skipped, false, false, { onPick })

      const row = await screen.findByRole('button', { name: /Prancha/ })
      fireEvent.click(row)

      expect({ text: row.textContent, picked: onPick.mock.calls.length }).toEqual({
        text: 'PranchaPulado0 de 3',
        picked: 1,
      })
    })
  })
})
