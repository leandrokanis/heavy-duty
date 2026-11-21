import type { LocalDb } from './local-db'
import type {
  NewPendingSet,
  PendingSet,
  QueueContents,
  QueueStore,
  RejectedSet,
  RejectionReason,
} from './sync.types'

export function createDexieQueueStore(db: LocalDb): QueueStore {
  return {
    async load(): Promise<QueueContents> {
      const [pending, rejected] = await Promise.all([
        db.pendingSets.orderBy('seq').toArray(),
        db.rejectedSets.toArray(),
      ])
      return { pending, rejected: rejected.sort((a, b) => a.rejectedAt - b.rejectedAt) }
    },
    async add(set) {
      return db.transaction('rw', db.pendingSets, async () => {
        const existing = await db.pendingSets.where('id').equals(set.body.id).first()
        if (existing) return existing
        const seq = await db.pendingSets.add({ ...set, id: set.body.id } as PendingSet)
        return { ...set, id: set.body.id, seq }
      })
    },
    async remove(id) {
      await db.pendingSets.where('id').equals(id).delete()
    },
    async reject(id, reason) {
      await db.transaction('rw', db.pendingSets, db.rejectedSets, async () => {
        const pending = await db.pendingSets.where('id').equals(id).first()
        if (!pending) return
        await db.pendingSets.where('id').equals(id).delete()
        await db.rejectedSets.put(rejectedOf(pending, reason))
      })
    },
    async clearRejected() {
      await db.rejectedSets.clear()
    },
  }
}

export function rejectedOf(pending: PendingSet, reason: RejectionReason): RejectedSet {
  return { id: pending.id, workoutId: pending.workoutId, body: pending.body, ...reason }
}

export function createMemoryQueueStore(): QueueStore {
  let nextSeq = 1
  let pending: PendingSet[] = []
  let rejected: RejectedSet[] = []
  return {
    async load() {
      return { pending: [...pending], rejected: [...rejected] }
    },
    async add(set: NewPendingSet) {
      const existing = pending.find(({ id }) => id === set.body.id)
      if (existing) return existing
      const added: PendingSet = { ...set, id: set.body.id, seq: nextSeq++ }
      pending = [...pending, added]
      return added
    },
    async remove(id) {
      pending = pending.filter((set) => set.id !== id)
    },
    async reject(id, reason) {
      const found = pending.find((set) => set.id === id)
      if (!found) return
      pending = pending.filter((set) => set.id !== id)
      rejected = [...rejected, rejectedOf(found, reason)]
    },
    async clearRejected() {
      rejected = []
    },
  }
}
