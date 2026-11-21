import type { FinishWorkoutBody } from '@/features/workout/workout-finish.types'
import type { RecordWorkoutSetBody, SendOutcome } from '@/features/workout/workout-set.types'
import type { RecordWorkoutSkipBody } from '@/features/workout/workout-skip.types'
import { itemIdOf, rejectedOf } from './queue-store'
import type { NewPendingItem, PendingItem, QueueContents, QueueStore } from './sync.types'

export type SendItem = (item: PendingItem) => Promise<SendOutcome>

export type SyncQueueOptions = {
  store: QueueStore
  send: SendItem
  now?: () => number
}

export type SyncQueue = {
  enqueue(workoutId: string, body: RecordWorkoutSetBody): Promise<void>
  // An exercise left out goes after the sets and before the end; the same exercise twice does nothing.
  enqueueSkip(workoutId: string, body: RecordWorkoutSkipBody): Promise<void>
  // The end of the workout goes after its sets; a second call for the same workout does nothing.
  enqueueFinish(workoutId: string, body: FinishWorkoutBody): Promise<void>
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
      const outcome = await send(head)
      if (outcome.status === 'retry') return
      // A refused finish or skip leaves in silence: the athlete cannot fix it and it must not block
      // the queue (ADR-022, ADR-023).
      if (outcome.status === 'confirmed' || head.kind !== 'set') {
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

  async function add(item: NewPendingItem): Promise<void> {
    await ready
    const id = itemIdOf(item)
    if (snapshot.pending.some((stored) => stored.id === id)) return
    const added = { ...item, id, seq: (snapshot.pending.at(-1)?.seq ?? 0) + 1 } as PendingItem
    update(({ pending, rejected }) => ({ pending: [...pending, added], rejected }))
    await persist(() => store.add(item))
    void flush()
  }

  return {
    enqueue: (workoutId, body) => add({ kind: 'set', workoutId, body, queuedAt: now() }),
    enqueueSkip: (workoutId, body) => add({ kind: 'skip', workoutId, body, queuedAt: now() }),
    enqueueFinish: (workoutId, body) => add({ kind: 'finish', workoutId, body, queuedAt: now() }),
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
