import { describe, expect, it, vi } from 'vitest'
import type { FinishWorkoutBody } from '@/features/workout/workout-finish.types'
import type { SendOutcome } from '@/features/workout/workout-set.types'
import { createMemoryQueueStore } from './queue-store'
import type { PendingItem, QueueStore } from './sync.types'
import { createSyncQueue } from './sync-queue'
import { pendingSetBody } from './test-sets'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const NOW_MS = Date.UTC(2026, 10, 21, 18, 31, 5)

const CONFIRMED: SendOutcome = { status: 'confirmed' }
const RETRY: SendOutcome = { status: 'retry' }

describe('Given two sets enqueued while send answers retry', () => {
  describe('When send starts answering confirmed and flush runs', () => {
    it('Then should send both sets in registration order with the same id and body and empty the queue', async () => {
      const first = pendingSetBody({ id: 'set-1', setNumber: 1 })
      const second = pendingSetBody({ id: 'set-2', setNumber: 2 })
      let outcome: SendOutcome = RETRY
      const send = vi.fn(async (_item: PendingItem) => outcome)
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      await queue.enqueue(WORKOUT_ID, first)
      await queue.enqueue(WORKOUT_ID, second)
      await queue.flush()
      send.mockClear()

      outcome = CONFIRMED
      await queue.flush()

      expect({
        calls: send.mock.calls.map(([item]) => [item.workoutId, item.body]),
        pending: queue.getSnapshot().pending,
      }).toEqual({
        calls: [
          [WORKOUT_ID, first],
          [WORKOUT_ID, second],
        ],
        pending: [],
      })
    })
  })
})

describe('Given a send that has not answered yet', () => {
  describe('When a set is enqueued', () => {
    it('Then the store should already hold the set', async () => {
      const store = createMemoryQueueStore()
      const body = pendingSetBody({ id: 'set-1' })
      const queue = createSyncQueue({
        store,
        send: () => new Promise<SendOutcome>(() => {}),
        now: () => NOW_MS,
      })

      await queue.enqueue(WORKOUT_ID, body)

      expect((await store.load()).pending.map((set) => set.body)).toEqual([body])
    })
  })
})

describe('Given sets A, B and C in the queue', () => {
  describe('When send answers A with 422 planned_exercise_not_found and B with a network failure', () => {
    it('Then A should be rejected with its code and message, B and C should stay queued and C should not be sent', async () => {
      const a = pendingSetBody({ id: 'a' })
      const b = pendingSetBody({ id: 'b' })
      const c = pendingSetBody({ id: 'c' })
      const answers: Record<string, SendOutcome> = {
        a: {
          status: 'rejected',
          code: 'planned_exercise_not_found',
          message: 'exercício não encontrado na letra',
        },
        b: RETRY,
      }
      const send = vi.fn(async ({ id }: PendingItem) => answers[id] ?? RETRY)
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      for (const body of [a, b, c]) await queue.enqueue(WORKOUT_ID, body)

      await queue.flush()

      const { pending, rejected } = queue.getSnapshot()
      expect({
        pending: pending.map(({ id }) => id),
        rejected: rejected.map(({ id, code, message }) => ({ id, code, message })),
        sent: [...new Set(send.mock.calls.map(([item]) => item.id))],
      }).toEqual({
        pending: ['b', 'c'],
        rejected: [
          {
            id: 'a',
            code: 'planned_exercise_not_found',
            message: 'exercício não encontrado na letra',
          },
        ],
        sent: ['a', 'b'],
      })
    })
  })
})

describe('Given one set in the queue and a send that has not answered yet', () => {
  describe('When flush is called three times', () => {
    it('Then send should be called once and the three calls should share one promise', async () => {
      const send = vi.fn(() => new Promise<SendOutcome>(() => {}))
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      await queue.enqueue(WORKOUT_ID, pendingSetBody())

      const flushes = [queue.flush(), queue.flush(), queue.flush()]
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect({ calls: send.mock.calls.length, shared: flushes[0] === flushes[2] }).toEqual({
        calls: 1,
        shared: true,
      })
    })
  })
})

describe('Given a store whose writes fail', () => {
  describe('When a set is enqueued and send answers retry', () => {
    it('Then the snapshot should still count one pending set and the next flush should send it', async () => {
      const failing = async () => {
        throw new Error('QuotaExceededError')
      }
      const store: QueueStore = {
        ...createMemoryQueueStore(),
        add: failing,
        remove: failing,
        reject: failing,
        clearRejected: failing,
      }
      const body = pendingSetBody({ id: 'set-1' })
      let outcome: SendOutcome = RETRY
      const send = vi.fn(async (_item: PendingItem) => outcome)
      const queue = createSyncQueue({ store, send, now: () => NOW_MS })
      await queue.enqueue(WORKOUT_ID, body)
      await queue.flush()
      const countAfterRetry = queue.getSnapshot().pending.length

      outcome = CONFIRMED
      await queue.flush()

      expect({
        countAfterRetry,
        lastCall: send.mock.calls.map(([item]) => [item.workoutId, item.body]).at(-1),
        pendingAfterConfirm: queue.getSnapshot().pending.length,
      }).toEqual({ countAfterRetry: 1, lastCall: [WORKOUT_ID, body], pendingAfterConfirm: 0 })
    })
  })
})

describe('Given one set of workout W1 and one of workout W2 in the queue', () => {
  describe('When flush runs with the API answering confirmed', () => {
    it('Then each set should be sent to the sets of its own workout, in registration order', async () => {
      const send = vi.fn(async (_item: PendingItem) => CONFIRMED)
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      const w1 = pendingSetBody({ id: 'w1-set' })
      const w2 = pendingSetBody({ id: 'w2-set' })
      await queue.enqueue('workout-1', w1)
      await queue.enqueue('workout-2', w2)

      await queue.flush()

      expect(send.mock.calls.map(([item]) => [item.workoutId, item.body])).toEqual([
        ['workout-1', w1],
        ['workout-2', w2],
      ])
    })
  })
})

describe.each([
  { status: 400, code: 'validation_failed' },
  { status: 409, code: 'workout_conflict' },
])('Given sets A and B in the queue and the API answering A with $status', ({ code }) => {
  describe('When flush runs', () => {
    it('Then A should be rejected, B should be sent and A should never be sent again', async () => {
      const a = pendingSetBody({ id: 'a' })
      const b = pendingSetBody({ id: 'b', setNumber: 2 })
      const send = vi.fn(
        async ({ id }: PendingItem): Promise<SendOutcome> =>
          id === 'a' ? { status: 'rejected', code, message: 'recusada' } : CONFIRMED,
      )
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      await queue.enqueue(WORKOUT_ID, a)
      await queue.enqueue(WORKOUT_ID, b)

      await queue.flush()
      await queue.flush()

      const { pending, rejected } = queue.getSnapshot()
      expect({
        pending: pending.length,
        rejected: rejected.map((set) => set.code),
        sentIds: send.mock.calls.map(([item]) => item.id),
      }).toEqual({ pending: 0, rejected: [code], sentIds: ['a', 'b'] })
    })
  })
})

describe('Given a store whose reject write fails', () => {
  describe('When the API refuses the head set', () => {
    it('Then the refused set should stay in the rejected list and leave the pending one', async () => {
      const store: QueueStore = {
        ...createMemoryQueueStore(),
        reject: async () => {
          throw new Error('QuotaExceededError')
        },
      }
      const send = vi.fn(
        async (): Promise<SendOutcome> => ({
          status: 'rejected',
          code: 'planned_exercise_not_found',
          message: 'exercício removido',
        }),
      )
      const queue = createSyncQueue({ store, send, now: () => NOW_MS })
      await queue.enqueue(WORKOUT_ID, pendingSetBody({ id: 'set-1' }))

      await queue.flush()

      const { pending, rejected } = queue.getSnapshot()
      expect({ pending: pending.length, rejected: rejected.map(({ id }) => id) }).toEqual({
        pending: 0,
        rejected: ['set-1'],
      })
    })
  })
})

const FINISH_BODY: FinishWorkoutBody = {
  finishedAt: '2026-11-21T19:20:00.000Z',
  endReason: 'ended_early',
}

describe('Given two sets and the finish of the workout enqueued while send answers retry', () => {
  describe('When send starts answering confirmed and flush runs', () => {
    it('Then should send the items in order, sets first, and empty the queue', async () => {
      let outcome: SendOutcome = RETRY
      const send = vi.fn(async (_item: PendingItem) => outcome)
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      await queue.enqueue(WORKOUT_ID, pendingSetBody({ id: 'set-1', setNumber: 1 }))
      await queue.enqueue(WORKOUT_ID, pendingSetBody({ id: 'set-2', setNumber: 2 }))
      await queue.enqueueFinish(WORKOUT_ID, FINISH_BODY)
      await queue.flush()
      send.mockClear()

      outcome = CONFIRMED
      await queue.flush()

      expect({
        sent: send.mock.calls.map(([item]) => [item.kind, item.id]),
        pending: queue.getSnapshot().pending,
      }).toEqual({
        sent: [
          ['set', 'set-1'],
          ['set', 'set-2'],
          ['finish', `${WORKOUT_ID}:finish`],
        ],
        pending: [],
      })
    })
  })
})

describe('Given the finish of a workout already in the queue', () => {
  describe('When enqueueFinish runs again for the same workout', () => {
    it('Then the queue should hold one finish', async () => {
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: () => new Promise<SendOutcome>(() => {}),
        now: () => NOW_MS,
      })
      await queue.enqueueFinish(WORKOUT_ID, FINISH_BODY)

      await queue.enqueueFinish(WORKOUT_ID, FINISH_BODY)

      expect(queue.getSnapshot().pending.map(({ id }) => id)).toEqual([`${WORKOUT_ID}:finish`])
    })
  })
})

describe('Given a send that has not answered yet, for the finish', () => {
  describe('When the finish is enqueued', () => {
    it('Then the store should already hold the finish', async () => {
      const store = createMemoryQueueStore()
      const queue = createSyncQueue({
        store,
        send: () => new Promise<SendOutcome>(() => {}),
        now: () => NOW_MS,
      })

      await queue.enqueueFinish(WORKOUT_ID, FINISH_BODY)

      expect((await store.load()).pending.map(({ kind, body }) => [kind, body])).toEqual([
        ['finish', FINISH_BODY],
      ])
    })
  })
})

describe('Given the finish of workout W1 followed by a set of workout W2 in the queue', () => {
  describe('When the API refuses the finish with 404', () => {
    it('Then the finish should leave the queue with no entry in rejected, and the set of W2 should still be sent', async () => {
      const send = vi.fn(
        async (item: PendingItem): Promise<SendOutcome> =>
          item.kind === 'finish'
            ? { status: 'rejected', code: 'workout_not_found', message: 'treino não encontrado' }
            : CONFIRMED,
      )
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send, now: () => NOW_MS })
      await queue.enqueueFinish('workout-1', FINISH_BODY)
      await queue.enqueue('workout-2', pendingSetBody({ id: 'w2-set' }))

      await queue.flush()

      expect({
        sent: send.mock.calls.map(([item]) => item.id),
        snapshot: queue.getSnapshot(),
      }).toEqual({ sent: ['workout-1:finish', 'w2-set'], snapshot: { pending: [], rejected: [] } })
    })
  })
})
