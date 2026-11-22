import { describe, expect, it } from 'vitest'
import {
  groupTrainingsOf,
  simulateGroupWindows,
  summarizeWindows,
  windowOf,
  windowStateOf,
} from './window.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'

const HOUR_MS = 60 * 60 * 1000
const TRAINED_AT_MS = Date.parse('2025-03-03T10:00:00.000Z')

describe('Given a chest workout in a hypertrophy program with 1,200,000 g of volume', () => {
  describe('When the window of the training is computed with the starting parameters', () => {
    it('Then should open 40 h plus 20 h after the training and close 48 h after opening', () => {
      const training = {
        trainedAtMs: TRAINED_AT_MS,
        goal: 'hypertrophy' as const,
        volumeG: 1200000,
      }

      const window = windowOf(training, GAME_PARAMETERS)

      expect({
        opensAt: new Date(window.opensAtMs).toISOString(),
        openDurationMs: window.closesAtMs - window.opensAtMs,
      }).toEqual({ opensAt: '2025-03-05T22:00:00.000Z', openDurationMs: 48 * HOUR_MS })
    })
  })
})

describe('Given the same chest training with 1,200,000 g of volume in each goal', () => {
  describe('When the window is computed with the starting parameters', () => {
    it.each([
      { goal: 'strength' as const, adjustedVolumeG: 1560000, opensAt: '2025-03-06T04:00:00.000Z' },
      { goal: 'endurance' as const, adjustedVolumeG: 900000, opensAt: '2025-03-05T17:00:00.000Z' },
    ])(
      'Then $goal should have adjusted volume $adjustedVolumeG and open at $opensAt',
      ({ goal, adjustedVolumeG, opensAt }) => {
        const training = { trainedAtMs: TRAINED_AT_MS, goal, volumeG: 1200000 }

        const window = windowOf(training, GAME_PARAMETERS)

        expect({
          adjustedVolumeG: window.adjustedVolumeG,
          opensAt: new Date(window.opensAtMs).toISOString(),
        }).toEqual({ adjustedVolumeG, opensAt })
      },
    )
  })
})

describe('Given a hypertrophy training with 11,000 kg of volume', () => {
  describe('When the window is computed', () => {
    it('Then should open at the cap of 72 h', () => {
      const training = {
        trainedAtMs: TRAINED_AT_MS,
        goal: 'hypertrophy' as const,
        volumeG: 11000000,
      }

      const window = windowOf(training, GAME_PARAMETERS)

      expect(window.opensAtMs - TRAINED_AT_MS).toBe(72 * HOUR_MS)
    })
  })
})

const benchPress = { primaryGroupSlugs: ['chest'], secondaryGroupSlugs: ['triceps'] }
const pushdown = { primaryGroupSlugs: ['triceps'], secondaryGroupSlugs: [] as string[] }

const workoutSet = (overrides = {}) => ({
  workoutId: 'w1',
  letter: 'A',
  goal: 'hypertrophy' as const,
  performedAtMs: TRAINED_AT_MS,
  loadG: 40000,
  reps: 10 as number | null,
  seconds: null as number | null,
  ...benchPress,
  ...overrides,
})

describe('Given a workout with a bench press set and a triceps pushdown set', () => {
  describe('When the trainings of each group are computed', () => {
    it('Then chest and triceps should have a training and triceps volume should add half of the bench press and the pushdown', () => {
      const sets = [workoutSet(), workoutSet({ ...pushdown, loadG: 20000 })]

      const trainings = groupTrainingsOf(sets, GAME_PARAMETERS)

      expect({
        chest: trainings.get('chest')?.map(({ volumeG }) => volumeG),
        triceps: trainings.get('triceps')?.map(({ volumeG }) => volumeG),
      }).toEqual({ chest: [400000], triceps: [400000] })
    })
  })
})

describe('Given a workout with only bench press sets', () => {
  describe('When the trainings of each group are computed', () => {
    it('Then triceps should have no training', () => {
      const trainings = groupTrainingsOf([workoutSet()], GAME_PARAMETERS)

      expect([...trainings.keys()]).toEqual(['chest'])
    })
  })
})

describe('Given a workout with two chest sets at different instants', () => {
  describe('When the trainings of each group are computed', () => {
    it('Then the training instant should be the last chest set', () => {
      const sets = [
        workoutSet({ performedAtMs: TRAINED_AT_MS + HOUR_MS }),
        workoutSet({ performedAtMs: TRAINED_AT_MS }),
      ]

      const trainings = groupTrainingsOf(sets, GAME_PARAMETERS)

      expect(trainings.get('chest')?.[0]?.trainedAtMs).toBe(TRAINED_AT_MS + HOUR_MS)
    })
  })
})

describe('Given a workout with only a time exercise of the chest group', () => {
  describe('When the trainings of each group are computed', () => {
    it('Then chest should have a training with volumeG 0', () => {
      const sets = [workoutSet({ reps: null, seconds: 45 })]

      const trainings = groupTrainingsOf(sets, GAME_PARAMETERS)

      expect(trainings.get('chest')).toEqual([
        {
          workoutId: 'w1',
          letter: 'A',
          trainedAtMs: TRAINED_AT_MS,
          goal: 'hypertrophy',
          volumeG: 0,
        },
      ])
    })
  })
})

describe('Given two trainings of the same group with no volume, whose first window is 40 h to 88 h after it', () => {
  const trainingAt = (workoutId: string, hoursAfter: number) => ({
    workoutId,
    letter: 'A',
    trainedAtMs: TRAINED_AT_MS + hoursAfter * HOUR_MS,
    goal: 'hypertrophy' as const,
    volumeG: 0,
  })
  const NOW_MS = TRAINED_AT_MS + 1000 * HOUR_MS

  describe('When the windows are simulated', () => {
    it.each([
      { case: 'before it opens', hours: 39, relation: 'early', outcome: 'replaced' },
      { case: 'exactly when it opens', hours: 40, relation: 'in_window', outcome: 'used' },
      { case: 'just before it closes', hours: 87, relation: 'in_window', outcome: 'used' },
      { case: 'exactly when it closes', hours: 88, relation: 'late', outcome: 'missed' },
    ])(
      'Then a second training $case should be $relation and the first window $outcome',
      ({ hours, relation, outcome }) => {
        const trainings = [trainingAt('w1', 0), trainingAt('w2', hours)]

        const { trainings: simulated } = simulateGroupWindows(trainings, GAME_PARAMETERS, NOW_MS)

        expect([simulated[0]?.relation, simulated[1]?.relation, simulated[0]?.outcome]).toEqual([
          'first',
          relation,
          outcome,
        ])
      },
    )

    it.each([
      { case: 'before it opens', hours: 39, outcome: 'pending' },
      { case: 'exactly when it opens', hours: 40, outcome: 'open' },
      { case: 'just before it closes', hours: 87, outcome: 'open' },
      { case: 'exactly when it closes', hours: 88, outcome: 'missed' },
    ])('Then the last window with now $case should be $outcome', ({ hours, outcome }) => {
      const nowMs = TRAINED_AT_MS + hours * HOUR_MS

      const { trainings } = simulateGroupWindows([trainingAt('w1', 0)], GAME_PARAMETERS, nowMs)

      expect(trainings[0]?.outcome).toBe(outcome)
    })
  })
})

describe('Given five trainings of a group with 2 used windows, 1 missed, 1 replaced and 1 pending', () => {
  const trainingAfter = (hours: number) => ({
    workoutId: `w${hours}`,
    letter: 'A',
    trainedAtMs: TRAINED_AT_MS + hours * HOUR_MS,
    goal: 'hypertrophy' as const,
    volumeG: 0,
  })

  describe('When the windows are simulated', () => {
    it('Then the summary should count them and round usedPercent of 2 in 3 to 67', () => {
      const trainings = [0, 50, 60, 200, 250].map(trainingAfter)
      const nowMs = TRAINED_AT_MS + 260 * HOUR_MS

      const { summary } = simulateGroupWindows(trainings, GAME_PARAMETERS, nowMs)

      expect(summary).toEqual({
        windowsUsed: 2,
        windowsMissed: 1,
        trainedEarly: 1,
        usedPercent: 67,
      })
    })
  })

  describe('When no window is used or missed yet', () => {
    it('Then usedPercent should be null', () => {
      const { summary } = simulateGroupWindows([trainingAfter(0)], GAME_PARAMETERS, TRAINED_AT_MS)

      expect(summary).toEqual({
        windowsUsed: 0,
        windowsMissed: 0,
        trainedEarly: 0,
        usedPercent: null,
      })
    })
  })

  describe('When the summary is computed over a part of the trainings', () => {
    it('Then it should count only that part', () => {
      const { trainings } = simulateGroupWindows(
        [0, 50, 60, 200, 250].map(trainingAfter),
        GAME_PARAMETERS,
        TRAINED_AT_MS + 260 * HOUR_MS,
      )

      expect(summarizeWindows(trainings.slice(3)).windowsUsed).toBe(1)
    })
  })
})

describe('Given a training whose window opens at 2025-03-05T22:00Z and closes at 2025-03-07T22:00Z', () => {
  const training = { trainedAtMs: TRAINED_AT_MS, goal: 'hypertrophy' as const, volumeG: 1200000 }

  describe.each([
    { case: 'just before the opening', now: '2025-03-05T21:59:59.999Z', state: 'resting' },
    { case: 'exactly at the opening', now: '2025-03-05T22:00:00.000Z', state: 'open' },
    { case: 'just before the closing', now: '2025-03-07T21:59:59.999Z', state: 'open' },
    { case: 'exactly at the closing', now: '2025-03-07T22:00:00.000Z', state: 'cooling' },
  ])('When the state is read $case', ({ now, state }) => {
    it(`Then should be ${state}`, () => {
      expect(windowStateOf(training, GAME_PARAMETERS, Date.parse(now))).toBe(state)
    })
  })

  describe('When the group has no training', () => {
    it('Then should be none', () => {
      expect(windowStateOf(undefined, GAME_PARAMETERS, TRAINED_AT_MS)).toBe('none')
    })
  })
})
