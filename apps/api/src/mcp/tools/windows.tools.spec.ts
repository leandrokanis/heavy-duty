import { describe, expect, it } from 'vitest'
import { addExercise } from '../../modules/catalog/exercise.service.js'
import { addMuscle } from '../../modules/catalog/muscle.service.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import { type RecordWorkoutInput, recordWorkout } from '../../test/workouts.js'

type App = ProgramTestApp['app']

type GroupRow = {
  muscleGroup: { slug: string; name: string }
  volumeG: number
  previousVolumeG: number
  changePercent: number | null
  timeSeconds: number
  previousTimeSeconds: number
}

type VolumeResponse = {
  from: string
  to: string
  previousFrom: string
  previousTo: string
  groups: GroupRow[]
}

type JsonRpcResponse = {
  result?: {
    structuredContent?: unknown
    isError?: boolean
    content?: { type: string; text: string }[]
    tools?: { name: string; description?: string; annotations?: { readOnlyHint?: boolean } }[]
  }
}

async function rpc(app: App, method: string, params: Record<string, unknown>) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return (await response.json()) as JsonRpcResponse
}

function callTool(app: App, args: Record<string, unknown>) {
  return rpc(app, 'tools/call', { name: 'get_muscle_group_volume', arguments: args })
}

async function getVolume(app: App, args: Record<string, unknown> = { from: FROM, to: TO }) {
  const called = await callTool(app, args)
  return called.result?.structuredContent as VolumeResponse
}

const FROM = '2026-11-09T03:00:00.000Z'
const TO = '2026-11-16T03:00:00.000Z'
const IN_WEEK = '2026-11-10T18:00:00.000Z'

type SetInput = RecordWorkoutInput['sets'][number]

async function createProgram(app: App): Promise<string> {
  const response = await app.request('/api/programs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Programa 1', goal: 'hypertrophy' }),
  })
  return ((await response.json()) as { id: string }).id
}

// 'Supino com halteres' (chest primary, triceps secondary) and 'Remada' (back primary).
async function givenCatalogAndProgram() {
  const testApp = createProgramTestApp()
  const { app, db } = testApp
  addMuscle(db, { name: 'tríceps braquial', muscleGroupSlug: 'triceps' })
  addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
  addExercise(db, {
    name: 'Supino com halteres',
    kind: 'reps',
    primaryMuscleSlugs: ['peitoral-maior'],
    secondaryMuscleSlugs: ['triceps-braquial'],
  })
  addExercise(db, { name: 'Remada', kind: 'reps', primaryMuscleSlugs: ['grande-dorsal'] })
  const programId = await createProgram(app)
  const record = (startedAt: string, sets: SetInput[]) =>
    recordWorkout(db, { programId, letter: 'A', startedAt, sets }, testApp.clock.now())
  return { ...testApp, programId, record }
}

const sets = (exerciseSlug: string, count: number, loadG: number, reps: number): SetInput[] =>
  Array.from({ length: count }, () => ({ exerciseSlug, loadG, reps }))

describe('Given 3 sets of 10 reps with 40 kg of an exercise with chest primary and triceps secondary in the week', () => {
  describe('When get_muscle_group_volume is called through /mcp with the interval of the week', () => {
    it('Then should return the 11 groups in catalog order, chest with 1200000 and triceps with 600000', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(IN_WEEK, sets('supino-com-halteres', 3, 40000, 10))

      const volume = await getVolume(app)

      expect(volume.groups.map(({ muscleGroup, volumeG }) => [muscleGroup.slug, volumeG])).toEqual([
        ['chest', 1200000],
        ['back', 0],
        ['lower-back', 0],
        ['shoulders', 0],
        ['biceps', 0],
        ['triceps', 600000],
        ['abs', 0],
        ['quadriceps', 0],
        ['hamstrings', 0],
        ['glutes', 0],
        ['calves', 0],
      ])
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then get_muscle_group_volume should be read only', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'get_muscle_group_volume')

      expect(tool?.annotations?.readOnlyHint).toBe(true)
    })
  })
})

describe('Given 2,000 kg of back volume in the previous week and 2,400 kg in the week', () => {
  const PREVIOUS_WEEK = '2026-11-03T18:00:00.000Z'
  const backOf = (group: VolumeResponse) =>
    group.groups.find(({ muscleGroup }) => muscleGroup.slug === 'back')

  describe('When get_muscle_group_volume is called with the interval of the week', () => {
    it('Then back should have previousVolumeG 2000000 and changePercent 20', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(PREVIOUS_WEEK, sets('remada', 4, 50000, 10))
      record(IN_WEEK, sets('remada', 3, 80000, 10))

      const volume = await getVolume(app)

      expect(backOf(volume)).toMatchObject({
        volumeG: 2400000,
        previousVolumeG: 2000000,
        changePercent: 20,
      })
    })

    it('Then should return previousFrom and previousTo of the interval before', async () => {
      const { app } = await givenCatalogAndProgram()

      const volume = await getVolume(app)

      expect([volume.previousFrom, volume.previousTo]).toEqual(['2026-11-02T03:00:00.000Z', FROM])
    })
  })

  describe('When the previous week has no volume of back', () => {
    it('Then back should have changePercent null', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(IN_WEEK, sets('remada', 3, 80000, 10))

      const volume = await getVolume(app)

      expect(backOf(volume)?.changePercent).toBeNull()
    })
  })
})

describe('Given sets performed exactly at the bounds of the interval', () => {
  const chestOf = (volume: VolumeResponse) =>
    volume.groups.find(({ muscleGroup }) => muscleGroup.slug === 'chest')
  const oneSetAt = (performedAt: string): SetInput[] => [
    { exerciseSlug: 'supino-reto', loadG: 10000, reps: 10, performedAt },
  ]

  describe('When get_muscle_group_volume is called', () => {
    it('Then a set at from should count in the interval and not in the previous one', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(IN_WEEK, oneSetAt(FROM))

      const volume = await getVolume(app)

      expect(chestOf(volume)).toMatchObject({ volumeG: 100000, previousVolumeG: 0 })
    })

    it('Then a set at to should count in neither interval', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(IN_WEEK, oneSetAt(TO))

      const volume = await getVolume(app)

      expect(chestOf(volume)).toMatchObject({ volumeG: 0, previousVolumeG: 0 })
    })

    it('Then a set of a workout in progress, with no finishedAt, should count', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(IN_WEEK, oneSetAt(IN_WEEK))

      const volume = await getVolume(app)

      expect(chestOf(volume)?.volumeG).toBe(100000)
    })
  })
})

describe('Given an invalid interval', () => {
  describe.each([
    {
      case: 'no to',
      args: { from: FROM },
      code: 'workout_range_required',
      message: 'informe o início e o fim do intervalo em UTC',
    },
    {
      case: 'to equal to from',
      args: { from: FROM, to: FROM },
      code: 'workout_range_inverted',
      message: 'o fim do intervalo deve ser depois do início',
    },
    {
      case: 'more than 92 days',
      args: { from: FROM, to: '2027-02-12T03:00:00.000Z' },
      code: 'workout_range_too_long',
      message: 'o intervalo deve ter no máximo 92 dias',
    },
  ])('When get_muscle_group_volume is called with $case', ({ args, code, message }) => {
    it(`Then should return isError with ${code} and the message of list_workouts`, async () => {
      const { app } = createProgramTestApp()

      const called = await callTool(app, args)

      expect({
        isError: called.result?.isError,
        text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
      }).toEqual({ isError: true, text: { code, message } })
    })
  })
})

type SimulatedTrainingRow = {
  workoutId: string
  letter: string
  trainedAt: string
  goal: string
  volumeG: number
  adjustedVolumeG: number
  relation: string
  window: { opensAt: string; closesAt: string; outcome: string }
}

type SimulationResponse = {
  parameters: Record<string, unknown>
  from: string | null
  to: string | null
  groups: {
    muscleGroup: { slug: string; name: string }
    summary: Record<string, unknown>
    trainings: SimulatedTrainingRow[]
  }[]
}

async function simulate(app: App, args: Record<string, unknown> = {}) {
  const called = await rpc(app, 'tools/call', {
    name: 'simulate_activity_windows',
    arguments: args,
  })
  return called.result?.structuredContent as SimulationResponse
}

const MONDAY_7H = '2025-03-03T10:00:00.000Z'
const THURSDAY_7H = '2025-03-06T10:00:00.000Z'

describe('Given the athlete trained back on Monday and Thursday at 7h in Brasilia', () => {
  describe('When simulate_activity_windows is called for back through /mcp', () => {
    it('Then should return both trainings with the window that opens after each and the relation to the previous one', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(MONDAY_7H, sets('remada', 3, 40000, 10))
      record(THURSDAY_7H, sets('remada', 3, 40000, 10))

      const simulation = await simulate(app, { muscleGroupSlug: 'back' })

      expect(
        simulation.groups.map(({ muscleGroup, trainings }) => [
          muscleGroup.slug,
          trainings.map(({ trainedAt, relation, window }) => [
            trainedAt,
            relation,
            window.opensAt,
            window.closesAt,
          ]),
        ]),
      ).toEqual([
        [
          'back',
          [
            [MONDAY_7H, 'first', '2025-03-05T06:00:00.000Z', '2025-03-08T10:00:00.000Z'],
            [THURSDAY_7H, 'in_window', '2025-03-08T06:00:00.000Z', '2025-03-11T10:00:00.000Z'],
          ],
        ],
      ])
    })

    it('Then should return the starting parameters', async () => {
      const { app } = await givenCatalogAndProgram()

      const simulation = await simulate(app)

      expect(simulation.parameters).toEqual({
        secondaryVolumePercent: 50,
        goalVolumePercent: { strength: 130, hypertrophy: 100, endurance: 75 },
        baseOpenHours: { strength: 24, hypertrophy: 24, endurance: 24 },
        openMinutesPerAdjustedKg: 1,
        maxOpenHours: 72,
        closeAfterHours: { strength: 120, hypertrophy: 120, endurance: 120 },
      })
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then simulate_activity_windows should be read only', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'simulate_activity_windows')

      expect(tool?.annotations?.readOnlyHint).toBe(true)
    })

    it('Then the simulate_activity_windows description should explain the fixed closing and the secondary muscle', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'simulate_activity_windows')

      expect(tool?.description).toEqual(
        expect.stringContaining('closes closeAfterHours after the training'),
      )
      expect(tool?.description).not.toEqual(expect.stringContaining('openDurationHours'))
      expect(tool?.description).toEqual(expect.stringContaining('primary or secondary muscle'))
    })
  })
})

function simulateRaw(app: App, args: Record<string, unknown>) {
  return rpc(app, 'tools/call', { name: 'simulate_activity_windows', arguments: args })
}

describe('Given a back training on Monday at 7h in Brasilia', () => {
  describe('When simulate_activity_windows is called with baseOpenHours.hypertrophy 30', () => {
    it('Then the window should open 30 h plus the volume time after and the response should show 30', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(MONDAY_7H, sets('remada', 3, 40000, 10))

      const simulation = await simulate(app, { parameters: { baseOpenHours: { hypertrophy: 30 } } })

      expect([
        simulation.groups[0]?.trainings[0]?.window.opensAt,
        (simulation.parameters.baseOpenHours as Record<string, number>).hypertrophy,
      ]).toEqual(['2025-03-05T12:00:00.000Z', 30])
    })

    it('Then the next simulation without parameters should use the starting ones', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(MONDAY_7H, sets('remada', 3, 40000, 10))
      await simulate(app, { parameters: { baseOpenHours: { hypertrophy: 30 } } })

      const simulation = await simulate(app)

      expect(simulation.groups[0]?.trainings[0]?.window.opensAt).toBe('2025-03-05T06:00:00.000Z')
    })
  })
})

describe('Given no recorded workout', () => {
  describe('When simulate_activity_windows is called', () => {
    it('Then should return no groups and no interval, with no error', async () => {
      const { app } = await givenCatalogAndProgram()

      const simulation = await simulate(app)

      expect([simulation.groups, simulation.from, simulation.to]).toEqual([[], null, null])
    })
  })
})

describe('Given an invalid parameter', () => {
  describe('When simulate_activity_windows is called with baseOpenHours.strength 1.5', () => {
    it('Then should return isError with window_parameters_invalid naming the parameter', async () => {
      const { app } = await givenCatalogAndProgram()

      const called = await simulateRaw(app, { parameters: { baseOpenHours: { strength: 1.5 } } })

      expect({
        isError: called.result?.isError,
        text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
      }).toEqual({
        isError: true,
        text: {
          code: 'window_parameters_invalid',
          message: 'parâmetro da janela inválido: baseOpenHours.strength',
        },
      })
    })
  })
})

const PREVIOUS_THURSDAY_7H = '2025-02-27T10:00:00.000Z'
const WEEK_FROM = '2025-03-03T03:00:00.000Z'
const WEEK_TO = '2025-03-10T03:00:00.000Z'

describe('Given a back training before the interval and one in it', () => {
  describe('When simulate_activity_windows is called with the interval of the week', () => {
    it('Then should return only the training of the week, in the window of the one before', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(PREVIOUS_THURSDAY_7H, sets('remada', 3, 40000, 10))
      record(MONDAY_7H, sets('remada', 3, 40000, 10))

      const simulation = await simulate(app, { from: WEEK_FROM, to: WEEK_TO })

      expect({
        interval: [simulation.from, simulation.to],
        trainings: simulation.groups.map(({ trainings }) =>
          trainings.map(({ trainedAt, relation }) => [trainedAt, relation]),
        ),
      }).toEqual({
        interval: [WEEK_FROM, WEEK_TO],
        trainings: [[[MONDAY_7H, 'in_window']]],
      })
    })

    it('Then the summary should count only the windows of the trainings returned', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(PREVIOUS_THURSDAY_7H, sets('remada', 3, 40000, 10))
      record(MONDAY_7H, sets('remada', 3, 40000, 10))

      const simulation = await simulate(app, { from: WEEK_FROM, to: WEEK_TO })

      expect(simulation.groups[0]?.summary).toEqual({
        windowsUsed: 0,
        windowsMissed: 1,
        trainedEarly: 0,
        usedPercent: 0,
      })
    })
  })
})

describe('Given an invalid filter', () => {
  describe.each([
    {
      case: 'only from',
      args: { from: WEEK_FROM },
      code: 'workout_range_required',
      message: 'informe o início e o fim do intervalo em UTC',
    },
    {
      case: 'more than 366 days',
      args: { from: WEEK_FROM, to: '2026-03-10T03:00:00.000Z' },
      code: 'workout_range_too_long',
      message: 'o intervalo deve ter no máximo 366 dias',
    },
    {
      case: 'a muscle group out of the catalog',
      args: { muscleGroupSlug: 'wings' },
      code: 'muscle_group_not_found',
      message: 'grupo muscular não encontrado',
    },
  ])('When simulate_activity_windows is called with $case', ({ args, code, message }) => {
    it(`Then should return isError with ${code}`, async () => {
      const { app } = await givenCatalogAndProgram()

      const called = await simulateRaw(app, args)

      expect({
        isError: called.result?.isError,
        text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
      }).toEqual({ isError: true, text: { code, message } })
    })
  })
})

describe('Given the whole history with back trained twice, chest once and triceps once as a secondary muscle', () => {
  describe('When simulate_activity_windows is called with no interval', () => {
    it('Then should return the groups with training in catalog order and the baseline of each', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(PREVIOUS_THURSDAY_7H, sets('remada', 3, 40000, 10))
      record(MONDAY_7H, sets('remada', 3, 40000, 10))
      record('2025-03-04T10:00:00.000Z', sets('supino-com-halteres', 3, 40000, 10))

      const simulation = await simulate(app)

      expect(
        simulation.groups.map(({ muscleGroup, summary }) => [muscleGroup.slug, summary]),
      ).toEqual([
        ['chest', { windowsUsed: 0, windowsMissed: 1, trainedEarly: 0, usedPercent: 0 }],
        ['back', { windowsUsed: 1, windowsMissed: 1, trainedEarly: 0, usedPercent: 50 }],
        ['triceps', { windowsUsed: 0, windowsMissed: 1, trainedEarly: 0, usedPercent: 0 }],
      ])
    })
  })
})

describe('Given back trained 3 days ago and chest trained now', () => {
  describe('When GET /api/windows and list_activity_windows are called at the same instant', () => {
    it('Then both responses should be equal', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record('2026-11-18T10:00:00.000Z', sets('remada', 3, 40000, 10))
      record('2026-11-21T10:00:00.000Z', sets('supino-com-halteres', 3, 40000, 10))

      const called = await rpc(app, 'tools/call', { name: 'list_activity_windows', arguments: {} })
      const fromApi = await (await app.request('/api/windows')).json()

      expect(called.result?.structuredContent).toEqual(fromApi)
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then list_activity_windows should be read only', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'list_activity_windows')

      expect(tool?.annotations?.readOnlyHint).toBe(true)
    })
  })
})

describe('Given back trained 3 days ago and chest trained now (US-F10-02)', () => {
  describe('When GET /api/levels and list_muscle_group_levels are called at the same instant', () => {
    it('Then both responses should be equal', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record('2026-11-18T10:00:00.000Z', sets('remada', 3, 40000, 10))
      record('2026-11-21T10:00:00.000Z', sets('supino-com-halteres', 3, 40000, 10))

      const called = await rpc(app, 'tools/call', {
        name: 'list_muscle_group_levels',
        arguments: {},
      })
      const fromApi = await (await app.request('/api/levels')).json()

      expect(called.result?.structuredContent).toEqual(fromApi)
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then list_muscle_group_levels should be read only', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'list_muscle_group_levels')

      expect(tool?.annotations?.readOnlyHint).toBe(true)
    })
  })
})

type WeekWindowsRow = {
  from: string
  to: string
  windowsUsed: number
  windowsMissed: number
  windowsOpen: number
  usedPercent: number | null
}

type WindowsUsedResponse = { now: string; from: string; to: string; weeks: WeekWindowsRow[] }

function callWindowsUsed(app: App, args: Record<string, unknown>) {
  return rpc(app, 'tools/call', { name: 'get_windows_used', arguments: args })
}

async function getWindowsUsed(app: App, args: Record<string, unknown>) {
  const called = await callWindowsUsed(app, args)
  return called.result?.structuredContent as WindowsUsedResponse
}

const WEEK_1 = '2025-03-03T03:00:00.000Z'
const WEEK_2 = '2025-03-10T03:00:00.000Z'
const WEEK_3 = '2025-03-17T03:00:00.000Z'

describe('Given back trained on Monday and Thursday at 7h in Brasilia, and not in the next week (US-F15b-01)', () => {
  describe('When get_windows_used is called through /mcp for the two weeks', () => {
    it('Then the first week should have 1 window used and the second 1 window missed', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(MONDAY_7H, sets('remada', 3, 40000, 10))
      record(THURSDAY_7H, sets('remada', 3, 40000, 10))

      const used = await getWindowsUsed(app, { from: WEEK_1, to: WEEK_3 })

      expect(used).toEqual({
        now: '2026-11-21T10:00:00.000Z',
        from: WEEK_1,
        to: WEEK_3,
        weeks: [
          {
            from: WEEK_1,
            to: WEEK_2,
            windowsUsed: 1,
            windowsMissed: 0,
            windowsOpen: 0,
            usedPercent: 100,
          },
          {
            from: WEEK_2,
            to: WEEK_3,
            windowsUsed: 0,
            windowsMissed: 1,
            windowsOpen: 0,
            usedPercent: 0,
          },
        ],
      })
    })
  })
})

describe('Given chest trained on Monday with triceps as a secondary muscle, and not again (US-F15b-01)', () => {
  describe('When get_windows_used is called for the week', () => {
    it('Then the week should have the windows of chest and triceps missed', async () => {
      const { app, record } = await givenCatalogAndProgram()
      record(MONDAY_7H, sets('supino-com-halteres', 3, 40000, 10))

      const used = await getWindowsUsed(app, { from: WEEK_1, to: WEEK_2 })

      expect(used.weeks[0]).toMatchObject({ windowsUsed: 0, windowsMissed: 2, usedPercent: 0 })
    })
  })
})

describe('Given no recorded workout (US-F15b-01)', () => {
  describe('When get_windows_used is called for the week', () => {
    it('Then the week should show 0 of 0, with usedPercent null', async () => {
      const { app } = await givenCatalogAndProgram()

      const used = await getWindowsUsed(app, { from: WEEK_1, to: WEEK_2 })

      expect(used.weeks).toEqual([
        {
          from: WEEK_1,
          to: WEEK_2,
          windowsUsed: 0,
          windowsMissed: 0,
          windowsOpen: 0,
          usedPercent: null,
        },
      ])
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then get_windows_used should be read only', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'get_windows_used')

      expect(tool?.annotations?.readOnlyHint).toBe(true)
    })
  })
})

describe('Given an invalid interval of weeks (US-F15b-01)', () => {
  describe.each([
    {
      case: 'no to',
      args: { from: WEEK_1 },
      code: 'workout_range_required',
      message: 'informe o início e o fim do intervalo em UTC',
    },
    {
      case: 'to equal to from',
      args: { from: WEEK_1, to: WEEK_1 },
      code: 'workout_range_inverted',
      message: 'o fim do intervalo deve ser depois do início',
    },
    {
      case: '14 weeks',
      args: { from: WEEK_1, to: '2025-06-09T03:00:00.000Z' },
      code: 'workout_range_too_long',
      message: 'o intervalo deve ter no máximo 92 dias',
    },
    {
      case: 'a week and a day',
      args: { from: WEEK_1, to: '2025-03-11T03:00:00.000Z' },
      code: 'windows_range_not_whole_weeks',
      message: 'o intervalo deve ter semanas inteiras, de 7 dias cada',
    },
  ])('When get_windows_used is called with $case', ({ args, code, message }) => {
    it(`Then should return isError with ${code}`, async () => {
      const { app } = createProgramTestApp()

      const called = await callWindowsUsed(app, args)

      expect({
        isError: called.result?.isError,
        text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
      }).toEqual({ isError: true, text: { code, message } })
    })
  })
})
