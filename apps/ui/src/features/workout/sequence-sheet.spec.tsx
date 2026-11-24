import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SequenceSheet } from './sequence-sheet'
import type { RecordedSetView, SequenceItem } from './workout-flow'

const SUPINO_SETS: RecordedSetView[] = [
  { setNumber: 1, loadG: 42500, reps: 10 },
  { setNumber: 2, loadG: 42500, reps: 10 },
  { setNumber: 3, loadG: 42500, reps: 10 },
]

const ALL_DONE: SequenceItem[] = [
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
    status: 'done',
    setsDone: 3,
    setsTotal: 3,
    recordedSets: [],
  },
]

type Handlers = {
  onPick?: () => void
  onSkip?: () => void
  onClose?: () => void
  onDiscard?: () => void
}

function renderSheet(
  items: SequenceItem[],
  finished: boolean,
  canSkip = false,
  { onPick = vi.fn(), onSkip = vi.fn(), onClose = vi.fn(), onDiscard = vi.fn() }: Handlers = {},
) {
  render(
    <SequenceSheet
      open
      items={items}
      finished={finished}
      canSkip={canSkip}
      returnFocusRef={{ current: null }}
      onClose={onClose}
      onPick={onPick}
      onSkip={onSkip}
      onEnd={vi.fn()}
      onDiscard={onDiscard}
    />,
  )
}

describe('Given the sequence sheet of a finished workout, with every exercise done', () => {
  describe('When the sheet renders', () => {
    it('Then should have no Encerrar or Descartar button and no item that leads to an exercise, only the close control', async () => {
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
    it('Then should offer the exercise to do as a button, with Encerrar and Descartar below it, and the exercise done as plain text', async () => {
      renderSheet(
        [
          {
            exerciseIndex: 0,
            name: 'Supino reto',
            status: 'current',
            setsDone: 1,
            setsTotal: 3,
            recordedSets: [],
          },
          {
            exerciseIndex: 1,
            name: 'Tríceps na polia',
            status: 'todo',
            setsDone: 0,
            setsTotal: 3,
            recordedSets: [],
          },
        ],
        false,
      )

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label') ?? button.textContent),
      ).toEqual(['Tríceps na poliaPor fazer0 de 3', 'Encerrar', 'Fechar', 'Descartar'])
    })
  })
})

const WITH_PRANCHA_CURRENT: SequenceItem[] = [
  {
    exerciseIndex: 0,
    name: 'Supino reto',
    status: 'done',
    setsDone: 3,
    setsTotal: 3,
    recordedSets: SUPINO_SETS,
  },
  {
    exerciseIndex: 1,
    name: 'Prancha',
    status: 'current',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 2,
    name: 'Tríceps na polia',
    status: 'todo',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
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
      name: 'Prancha',
      status: 'skipped',
      setsDone: 0,
      setsTotal: 3,
      recordedSets: [],
    },
    {
      exerciseIndex: 2,
      name: 'Tríceps na polia',
      status: 'current',
      setsDone: 0,
      setsTotal: 3,
      recordedSets: [],
    },
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

describe('Given a sequence with supino-reto done with 3 recorded sets and prancha current', () => {
  describe('When the sheet renders', () => {
    it('Then the list "Séries de Supino reto" should read the 3 sets in order, and the buttons stay Pular Prancha, the row of Tríceps na polia, Encerrar, Fechar and Descartar', async () => {
      renderSheet(WITH_PRANCHA_CURRENT, false, true)

      const dialog = await screen.findByRole('dialog')
      const sets = within(dialog).getByRole('list', { name: 'Séries de Supino reto' })
      expect({
        sets: within(sets)
          .getAllByRole('listitem')
          .map((item) => within(item).getByText(/^Série \d: /).textContent),
        buttons: within(dialog)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label') ?? button.textContent),
      }).toEqual({
        sets: [
          'Série 1: 42,5 kg, 10 repetições',
          'Série 2: 42,5 kg, 10 repetições',
          'Série 3: 42,5 kg, 10 repetições',
        ],
        buttons: [
          'Pular Prancha',
          'Tríceps na poliaPor fazer0 de 3',
          'Encerrar',
          'Fechar',
          'Descartar',
        ],
      })
    })
  })
})

describe('Given prancha done with 3 recorded sets of 45 seconds and 0 g', () => {
  describe('When the sheet renders', () => {
    it('Then "Série 1" should read "0 kg, 45 segundos" with no repetições', async () => {
      const items: SequenceItem[] = [
        {
          exerciseIndex: 0,
          name: 'Prancha',
          status: 'done',
          setsDone: 3,
          setsTotal: 3,
          recordedSets: [
            { setNumber: 1, loadG: 0, seconds: 45 },
            { setNumber: 2, loadG: 0, seconds: 45 },
            { setNumber: 3, loadG: 0, seconds: 45 },
          ],
        },
      ]
      renderSheet(items, true)

      const sets = within(await screen.findByRole('dialog')).getByRole('list', {
        name: 'Séries de Prancha',
      })
      expect({
        first: within(sets).getByText(/^Série 1: /).textContent,
        repetitions: within(sets).queryAllByText(/repetiç/).length,
      }).toEqual({ first: 'Série 1: 0 kg, 45 segundos', repetitions: 0 })
    })
  })
})

describe('Given a done exercise with a set of 1 repetition and a set of 1 second', () => {
  describe('When the sheet renders', () => {
    it('Then the sets should read "1 repetição" and "1 segundo" in the singular', async () => {
      const items: SequenceItem[] = [
        {
          exerciseIndex: 0,
          name: 'Barra fixa',
          status: 'done',
          setsDone: 2,
          setsTotal: 2,
          recordedSets: [
            { setNumber: 1, loadG: 0, reps: 1 },
            { setNumber: 2, loadG: 0, seconds: 1 },
          ],
        },
      ]
      renderSheet(items, true)

      const sets = within(await screen.findByRole('dialog')).getByRole('list', {
        name: 'Séries de Barra fixa',
      })
      expect(
        within(sets)
          .getAllByText(/^Série \d: /)
          .map((node) => node.textContent),
      ).toEqual(['Série 1: 0 kg, 1 repetição', 'Série 2: 0 kg, 1 segundo'])
    })
  })
})

describe.each(['current', 'skipped', 'todo'] as const)(
  'Given an exercise %s that carries a recorded set',
  (status) => {
    describe('When the sheet renders', () => {
      it('Then should have no list of sets', async () => {
        const items: SequenceItem[] = [
          {
            exerciseIndex: 0,
            name: 'Supino reto',
            status,
            setsDone: 1,
            setsTotal: 3,
            recordedSets: [{ setNumber: 1, loadG: 42500, reps: 10 }],
          },
        ]
        renderSheet(items, false)

        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).queryByRole('list', { name: 'Séries de Supino reto' })).toBeNull()
      })
    })
  },
)

describe('Given the sequence sheet of a finished workout with every exercise done and recorded', () => {
  describe('When the sheet renders', () => {
    it('Then should have one list of sets per exercise and only the Fechar button', async () => {
      const items: SequenceItem[] = ALL_DONE.map((item) => ({
        ...item,
        recordedSets: SUPINO_SETS,
      }))
      renderSheet(items, true)

      const dialog = await screen.findByRole('dialog')
      expect({
        lists: within(dialog)
          .getAllByRole('list')
          .map((list) => list.getAttribute('aria-label')),
        buttons: within(dialog)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label') ?? button.textContent),
      }).toEqual({
        lists: ['Exercícios', 'Séries de Supino reto', 'Séries de Tríceps na polia'],
        buttons: ['Fechar'],
      })
    })
  })
})

describe('Given supino-reto done with a set of 42500 g and 10 repetitions', () => {
  describe('When the sheet renders', () => {
    it('Then the visible text of the set should show "Série 1", "42,5", "kg", "10" and "rep"', async () => {
      renderSheet(WITH_PRANCHA_CURRENT, false)

      const sets = within(await screen.findByRole('dialog')).getByRole('list', {
        name: 'Séries de Supino reto',
      })
      const [firstSet] = within(sets).getAllByRole('listitem')
      const visible = firstSet?.querySelector('[aria-hidden="true"]')
      expect(visible?.textContent).toBe('Série 142,5 kg10 rep')
    })
  })
})

const MIXED: SequenceItem[] = [
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
    name: 'Crucifixo',
    status: 'current',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 2,
    name: 'Tríceps na polia',
    status: 'todo',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
  {
    exerciseIndex: 3,
    name: 'Prancha',
    status: 'skipped',
    setsDone: 0,
    setsTotal: 3,
    recordedSets: [],
  },
]

function rowsOf(dialog: HTMLElement): HTMLElement[] {
  const list = within(dialog).getByRole('list', { name: 'Exercícios' })
  return Array.from(list.querySelectorAll<HTMLElement>(':scope > li'))
}

describe('Given a sequence with an exercise done, the current one, one to do and one skipped', () => {
  describe('When the sheet renders', () => {
    it('Then every row should have a hidden circle with the status of the item', async () => {
      renderSheet(MIXED, false, true)

      const dialog = await screen.findByRole('dialog')
      expect(
        rowsOf(dialog).map((row) => {
          const circle = row.querySelector<HTMLElement>('[aria-hidden="true"][data-status]')
          return [circle?.dataset.status, circle?.getAttribute('aria-hidden')]
        }),
      ).toEqual([
        ['done', 'true'],
        ['current', 'true'],
        ['todo', 'true'],
        ['skipped', 'true'],
      ])
    })

    it('Then the circle of the current and the to-do rows should carry the position and no text node', async () => {
      renderSheet(MIXED, false, true)

      const dialog = await screen.findByRole('dialog')
      const circles = rowsOf(dialog).map((row) =>
        row.querySelector<HTMLElement>('[aria-hidden="true"][data-status]'),
      )
      expect(
        [circles[1], circles[2]].map((circle) => [circle?.dataset.position, circle?.textContent]),
      ).toEqual([
        ['2', ''],
        ['3', ''],
      ])
    })

    it('Then the circle of the done and the skipped rows should hold an icon', async () => {
      renderSheet(MIXED, false, true)

      const dialog = await screen.findByRole('dialog')
      const circles = rowsOf(dialog).map((row) =>
        row.querySelector<HTMLElement>('[aria-hidden="true"][data-status]'),
      )
      expect(
        [circles[0], circles[3]].map((circle) => circle?.querySelector('svg') !== null),
      ).toEqual([true, true])
    })

    it('Then the button of the exercise to do should read the name, the state and the count, without the position', async () => {
      renderSheet(MIXED, false, true)

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('button', { name: /^Tríceps na polia/ }).textContent).toBe(
        'Tríceps na poliaPor fazer0 de 3',
      )
    })
  })

  describe('When the finger presses the row of the exercise to do and releases it', () => {
    it('Then the row should be marked as pressed and tapping it should call onPick', async () => {
      const onPick = vi.fn()
      renderSheet(MIXED, false, true, { onPick })
      const row = await screen.findByRole('button', { name: /^Tríceps na polia/ })

      fireEvent.pointerDown(row, { pointerType: 'touch', isPrimary: true, button: 0 })
      await waitFor(() => expect(row).toHaveAttribute('data-pressed'))
      fireEvent.click(row)

      expect(onPick).toHaveBeenCalledTimes(1)
    })
  })

  describe('When the athlete closes the sheet by Fechar, Escape or the backdrop', () => {
    it.each([
      [
        'Fechar',
        async () => fireEvent.click(await screen.findByRole('button', { name: 'Fechar' })),
      ],
      [
        'Escape',
        async () => fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' }),
      ],
    ])('Then %s should call onClose', async (_name, close) => {
      const onClose = vi.fn()
      renderSheet(MIXED, false, true, { onClose })

      await close()

      await waitFor(() => expect(onClose).toHaveBeenCalled())
    })
  })
})

describe('Given the sequence sheet of a workout in progress', () => {
  describe('When the athlete taps "Descartar"', () => {
    it('Then should call onDiscard once', async () => {
      const onDiscard = vi.fn()
      renderSheet(WITH_PRANCHA_CURRENT, false, true, { onDiscard })

      fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }))

      expect(onDiscard).toHaveBeenCalledTimes(1)
    })
  })
})
