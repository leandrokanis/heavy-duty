import type { LocalDb } from './local-db'
import type {
  NewPendingItem,
  PendingItem,
  PendingSet,
  QueueContents,
  QueueStore,
  RejectedSet,
  RejectionReason,
} from './sync.types'

export function itemIdOf(item: NewPendingItem): string {
  return item.kind === 'set' ? item.body.id : `${item.workoutId}:finish`
}

// A row saved before the finish existed has no kind.
function withKind(row: PendingItem): PendingItem {
  return { ...row, kind: row.kind ?? 'set' } as PendingItem
}

export function createDexieQueueStore(db: LocalDb): QueueStore {
  return {
    async load(): Promise<QueueContents> {
      const [pending, rejected] = await Promise.all([
        db.pendingSets.orderBy('seq').toArray(),
        db.rejectedSets.toArray(),
      ])
      return {
        pending: pending.map(withKind),
        rejected: rejected.sort((a, b) => a.rejectedAt - b.rejectedAt),
      }
    },
    async add(item) {
      const id = itemIdOf(item)
      return db.transaction('rw', db.pendingSets, async () => {
        const existing = await db.pendingSets.where('id').equals(id).first()
        if (existing) return withKind(existing)
        const seq = await db.pendingSets.add({ ...item, id } as PendingItem)
        return { ...item, id, seq } as PendingItem
      })
    },
    async remove(id) {
      await db.pendingSets.where('id').equals(id).delete()
    },
    async reject(id, reason) {
      await db.transaction('rw', db.pendingSets, db.rejectedSets, async () => {
        const pending = await db.pendingSets.where('id').equals(id).first()
        if (!pending || (pending.kind ?? 'set') !== 'set') return
        await db.pendingSets.where('id').equals(id).delete()
        await db.rejectedSets.put(rejectedOf(pending as PendingSet, reason))
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
  let pending: PendingItem[] = []
  let rejected: RejectedSet[] = []
  return {
    async load() {
      return { pending: [...pending], rejected: [...rejected] }
    },
    async add(item: NewPendingItem) {
      const id = itemIdOf(item)
      const existing = pending.find((stored) => stored.id === id)
      if (existing) return existing
      const added = { ...item, id, seq: nextSeq++ } as PendingItem
      pending = [...pending, added]
      return added
    },
    async remove(id) {
      pending = pending.filter((set) => set.id !== id)
    },
    async reject(id, reason) {
      const found = pending.find((set) => set.id === id)
      if (found?.kind !== 'set') return
      pending = pending.filter((set) => set.id !== id)
      rejected = [...rejected, rejectedOf(found, reason)]
    },
    async clearRejected() {
      rejected = []
    },
  }
}
