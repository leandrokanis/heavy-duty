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
    tools?: { name: string; annotations?: { readOnlyHint?: boolean } }[]
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
