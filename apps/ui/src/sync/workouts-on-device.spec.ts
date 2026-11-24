import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { SUPINO_RETO, todayDay } from '@/features/workout/test-today'
import { createWorkoutFlow } from '@/features/workout/workout-flow'
import { createActiveWorkoutStore } from './active-workout-store'
import { LocalDb } from './local-db'
import { createDexieQueueStore } from './queue-store'
import { pendingSetBody } from './test-sets'
import { createWorkoutsOnDevice } from './workouts-on-device'

const NOW_MS = Date.UTC(2026, 10, 21, 18, 31, 5)
const ACTIVE_ID = '0193a1b2-0000-7000-8000-000000000601'
const QUEUED_ID = '0193a1b2-0000-7000-8000-000000000602'

describe('Given an active workout and a set of another workout in the queue', () => {
  describe('When the workouts still on the device are read', () => {
    it('Then should return both ids', async () => {
      const db = new LocalDb(`on-device-${crypto.randomUUID()}`)
      await createActiveWorkoutStore(async () => db).save(
        createWorkoutFlow({
          workoutId: ACTIVE_ID,
          startedAt: '2026-11-21T18:30:00.000Z',
          programId: 'program-1',
          day: todayDay('A', 'Superior', [SUPINO_RETO]),
          windows: [],
          levels: [],
        }),
        NOW_MS,
      )
      await createDexieQueueStore(db).add({
        kind: 'set',
        workoutId: QUEUED_ID,
        body: pendingSetBody(),
        queuedAt: NOW_MS,
      })

      const ids = await createWorkoutsOnDevice(async () => db)(NOW_MS)

      expect([...ids].sort()).toEqual([ACTIVE_ID, QUEUED_ID])
    })
  })
})

describe('Given no IndexedDB', () => {
  describe('When the workouts still on the device are read', () => {
    it('Then should return no id', async () => {
      expect((await createWorkoutsOnDevice(async () => null)(NOW_MS)).size).toBe(0)
    })
  })
})
