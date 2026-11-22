import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { SUPINO_RETO, TRICEPS_POLIA, todayDay } from '@/features/workout/test-today'
import { RESUME_LIMIT_MS } from '@/features/workout/workout.config'
import { createWorkoutFlow, workoutFlowReducer } from '@/features/workout/workout-flow'
import {
  clearActiveWorkout,
  createActiveWorkoutStore,
  loadActiveWorkout,
  saveActiveWorkout,
} from './active-workout-store'
import { LocalDb } from './local-db'
import { createDexieQueueStore } from './queue-store'
import { pendingSetBody } from './test-sets'

const HOUR_MS = 60 * 60 * 1000
const T0 = Date.UTC(2026, 10, 21, 18, 31, 5)

const SAVED = workoutFlowReducer(
  createWorkoutFlow({
    workoutId: '0193a1b2-0000-7000-8000-000000000601',
    startedAt: '2026-11-21T18:30:00.000Z',
    programId: 'program-1',
    day: todayDay('A', 'Superior', [SUPINO_RETO, TRICEPS_POLIA]),
  }),
  { type: 'next', nowMs: T0 },
)

function freshStore() {
  const db = new LocalDb(`active-workout-${crypto.randomUUID()}`)
  return { db, store: createActiveWorkoutStore(async () => db) }
}

describe('Given an active workout saved with the last step 3 hours ago and a set in the queue', () => {
  describe('When loadActiveWorkout runs', () => {
    it('Then should return null, delete the active workout and keep the queued set', async () => {
      const { db, store } = freshStore()
      const queue = createDexieQueueStore(db)
      await queue.add({
        kind: 'set',
        workoutId: SAVED.session.workoutId,
        body: pendingSetBody(),
        queuedAt: T0,
      })
      await store.save(SAVED, T0)

      const loaded = await store.load(T0 + 3 * HOUR_MS)

      expect({
        loaded,
        stored: await db.activeWorkout.count(),
        queued: (await queue.load()).pending.length,
      }).toEqual({ loaded: null, stored: 0, queued: 1 })
    })
  })
})

describe('Given an active workout saved at T0', () => {
  describe('When loadActiveWorkout runs exactly at the resume limit', () => {
    it('Then should return the saved state', async () => {
      const { store } = freshStore()
      await store.save(SAVED, T0)

      expect(await store.load(T0 + RESUME_LIMIT_MS)).toEqual(SAVED)
    })
  })

  describe('When loadActiveWorkout runs 1 ms past the resume limit', () => {
    it('Then should return null', async () => {
      const { store } = freshStore()
      await store.save(SAVED, T0)

      expect(await store.load(T0 + RESUME_LIMIT_MS + 1)).toBeNull()
    })
  })

  describe('When clearActiveWorkout runs', () => {
    it('Then loadActiveWorkout should return null', async () => {
      const { store } = freshStore()
      await store.save(SAVED, T0)

      await store.clear()

      expect(await store.load(T0)).toBeNull()
    })
  })
})

describe('Given IndexedDB cannot open', () => {
  describe('When a workout is saved and loaded', () => {
    it('Then the state should come back from memory', async () => {
      const store = createActiveWorkoutStore(async () => null)
      await store.save(SAVED, T0)

      expect(await store.load(T0 + 1000)).toEqual(SAVED)
    })
  })
})

describe('Given the shared store of the page', () => {
  beforeEach(async () => {
    await clearActiveWorkout()
  })

  describe('When a workout is saved and loaded with the exported functions', () => {
    it('Then the state should come back', async () => {
      await saveActiveWorkout(SAVED, T0)

      expect(await loadActiveWorkout(T0 + 1000)).toEqual(SAVED)
    })
  })
})

describe('Given an active workout saved with an adjusted draft of 45000 g and 8 reps', () => {
  describe('When loadActiveWorkout runs', () => {
    it('Then should return the same draft', async () => {
      const { store } = freshStore()
      const adjusted = workoutFlowReducer(
        workoutFlowReducer(createWorkoutFlow(SAVED.session), {
          type: 'adjust',
          field: 'loadG',
          steps: 1,
        }),
        { type: 'adjust', field: 'reps', steps: -2 },
      )
      await store.save(adjusted, T0)

      const loaded = await store.load(T0)

      expect(loaded?.draft).toEqual({ loadG: 45_000, reps: 8, seconds: null })
    })
  })
})

describe('Given an active workout saved after the correction of its last set to 40000 g', () => {
  describe('When loadActiveWorkout runs a minute later', () => {
    it('Then should return the same state, with the corrected load on the last set', async () => {
      const { store } = freshStore()
      const open = workoutFlowReducer(SAVED, { type: 'openSheet', sheet: 'correction' })
      const corrected = workoutFlowReducer(open, {
        type: 'correctLastSet',
        values: { loadG: 40000, reps: 10, seconds: null },
        nowMs: T0 + 5_000,
      })
      await store.save(corrected, T0 + 5_000)

      const loaded = await store.load(T0 + 60_000)

      expect({ loadG: loaded?.recorded.at(-1)?.loadG, sameState: loaded }).toEqual({
        loadG: 40000,
        sameState: corrected,
      })
    })
  })
})
