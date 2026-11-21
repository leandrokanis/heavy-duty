import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { LocalDb } from './local-db'
import { createDexieQueueStore } from './queue-store'
import type { PendingSet } from './sync.types'
import { pendingSetBody } from './test-sets'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

describe('Given two sets added to the Dexie queue store', () => {
  describe('When a new LocalDb instance opens the same database', () => {
    it('Then load should return both sets in registration order with the same body', async () => {
      const databaseName = `queue-store-${crypto.randomUUID()}`
      const first = pendingSetBody({ id: 'set-1', setNumber: 1 })
      const second = pendingSetBody({ id: 'set-2', setNumber: 2 })
      const writer = createDexieQueueStore(new LocalDb(databaseName))
      await writer.add({ kind: 'set', workoutId: WORKOUT_ID, body: first, queuedAt: 1000 })
      await writer.add({ kind: 'set', workoutId: WORKOUT_ID, body: second, queuedAt: 1000 })

      const { pending } = await createDexieQueueStore(new LocalDb(databaseName)).load()

      expect(pending.map(({ body }) => body)).toEqual([first, second])
    })
  })
})

describe('Given a row written by the previous version, with no kind', () => {
  describe('When the Dexie queue store loads it', () => {
    it('Then should return it as a set, and the database should still be at version 1', async () => {
      const databaseName = `queue-store-${crypto.randomUUID()}`
      const body = pendingSetBody({ id: 'set-old' })
      const db = new LocalDb(databaseName)
      await db.pendingSets.add({
        id: 'set-old',
        workoutId: WORKOUT_ID,
        body,
        queuedAt: 1000,
      } as unknown as PendingSet)

      const { pending } = await createDexieQueueStore(db).load()

      expect({ items: pending.map(({ kind, id }) => [kind, id]), version: db.verno }).toEqual({
        items: [['set', 'set-old']],
        version: 1,
      })
    })
  })
})

describe('Given a skip added to the Dexie queue store', () => {
  describe('When a new LocalDb instance opens the same database', () => {
    it('Then load should return it with kind skip, its id and its body', async () => {
      const databaseName = `queue-store-${crypto.randomUUID()}`
      const body = { plannedExerciseId: 'planned-prancha', skippedAt: '2026-11-21T18:40:00.000Z' }
      await createDexieQueueStore(new LocalDb(databaseName)).add({
        kind: 'skip',
        workoutId: WORKOUT_ID,
        body,
        queuedAt: 1000,
      })

      const { pending } = await createDexieQueueStore(new LocalDb(databaseName)).load()

      expect(pending.map(({ kind, id, body }) => [kind, id, body])).toEqual([
        ['skip', `${WORKOUT_ID}:skip:planned-prancha`, body],
      ])
    })
  })
})
