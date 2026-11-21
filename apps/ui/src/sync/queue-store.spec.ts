import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { LocalDb } from './local-db'
import { createDexieQueueStore } from './queue-store'
import { pendingSetBody } from './test-sets'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

describe('Given two sets added to the Dexie queue store', () => {
  describe('When a new LocalDb instance opens the same database', () => {
    it('Then load should return both sets in registration order with the same body', async () => {
      const databaseName = `queue-store-${crypto.randomUUID()}`
      const first = pendingSetBody({ id: 'set-1', setNumber: 1 })
      const second = pendingSetBody({ id: 'set-2', setNumber: 2 })
      const writer = createDexieQueueStore(new LocalDb(databaseName))
      await writer.add({ workoutId: WORKOUT_ID, body: first, queuedAt: 1000 })
      await writer.add({ workoutId: WORKOUT_ID, body: second, queuedAt: 1000 })

      const { pending } = await createDexieQueueStore(new LocalDb(databaseName)).load()

      expect(pending.map(({ body }) => body)).toEqual([first, second])
    })
  })
})
