import type { RecordWorkoutSetBody, SendOutcome } from '@/features/workout/workout-set.types'
import { rejectedOf } from './queue-store'
import type { PendingSet, QueueContents, QueueStore } from './sync.types'

export type SendSet = (workoutId: string, body: RecordWorkoutSetBody) => Promise<SendOutcome>

export type SyncQueueOptions = {
  store: QueueStore
  send: SendSet
  now?: () => number
}

export type SyncQueue = {
  enqueue(workoutId: string, body: RecordWorkoutSetBody): Promise<void>
  flush(): Promise<void>
  dismissRejected(): Promise<void>
  subscribe(listener: () => void): () => void
  getSnapshot(): QueueContents
}

// In-order queue with an in-memory mirror: the screen reads the mirror, the store keeps it across reloads.
export function createSyncQueue({ store, send, now = Date.now }: SyncQueueOptions): SyncQueue {
  let snapshot: QueueContents = { pending: [], rejected: [] }
  const listeners = new Set<() => void>()
  // After the first failed write the queue lives in memory only, for the rest of the session.
  let storeFailed = false
  const ready = store
    .load()
    .catch((): QueueContents => {
      storeFailed = true
      return { pending: [], rejected: [] }
    })
    .then((loaded) => {
      snapshot = loaded
      notify()
    })

  async function persist(write: () => Promise<unknown>): Promise<void> {
    if (storeFailed) return
    try {
      await write()
    } catch {
      storeFailed = true
    }
  }

  function notify() {
    for (const listener of listeners) listener()
  }

  function update(change: (current: QueueContents) => QueueContents) {
    snapshot = change(snapshot)
    notify()
  }

  let inFlight: Promise<void> | null = null

  // One send at a time: a trigger that arrives mid-flush joins the running one.
  function flush(): Promise<void> {
    inFlight ??= run().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  async function run(): Promise<void> {
    await ready
    for (;;) {
      const head = snapshot.pending[0]
      if (!head) return
      const outcome = await send(head.workoutId, head.body)
      if (outcome.status === 'retry') return
      if (outcome.status === 'confirmed') {
        update(({ pending, rejected }) => ({
          pending: pending.filter(({ id }) => id !== head.id),
          rejected,
        }))
        await persist(() => store.remove(head.id))
      } else {
        const reason = { code: outcome.code, message: outcome.message, rejectedAt: now() }
        update(({ pending, rejected }) => ({
          pending: pending.filter(({ id }) => id !== head.id),
          rejected: [...rejected, rejectedOf(head, reason)],
        }))
        await persist(() => store.reject(head.id, reason))
      }
    }
  }

  return {
    async enqueue(workoutId, body) {
      await ready
      const set: PendingSet = {
        seq: (snapshot.pending.at(-1)?.seq ?? 0) + 1,
        id: body.id,
        workoutId,
        body,
        queuedAt: now(),
      }
      update(({ pending, rejected }) => ({ pending: [...pending, set], rejected }))
      await persist(() => store.add({ workoutId, body, queuedAt: set.queuedAt }))
      void flush()
    },
    flush,
    async dismissRejected() {
      update(({ pending }) => ({ pending, rejected: [] }))
      await persist(() => store.clearRejected())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
  }
}
