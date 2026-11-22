'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { postWorkoutFinish } from '@/features/workout/workout-finish-client'
import { postWorkoutSet } from '@/features/workout/workout-set-client'
import { patchWorkoutSet } from '@/features/workout/workout-set-correction-client'
import { postWorkoutSkip } from '@/features/workout/workout-skip-client'
import { openLocalDb } from './local-db'
import { createDexieQueueStore, createMemoryQueueStore } from './queue-store'
import type { PendingItem, QueueContents, QueueStore } from './sync.types'
import { createSyncQueue, type SyncQueue } from './sync-queue'
import { useSyncTriggers } from './use-sync-triggers'

const SyncQueueContext = createContext<SyncQueue | null>(null)

// Opens the database on the first use and falls back to memory when IndexedDB is unavailable (FR-016).
function createDeferredStore(): QueueStore {
  const opened: Promise<QueueStore> = openLocalDb().then((db) =>
    db ? createDexieQueueStore(db) : createMemoryQueueStore(),
  )
  return {
    load: async () => (await opened).load(),
    add: async (set) => (await opened).add(set),
    replace: async (item) => (await opened).replace(item),
    remove: async (id) => (await opened).remove(id),
    reject: async (id, reason) => (await opened).reject(id, reason),
    clearRejected: async () => (await opened).clearRejected(),
  }
}

// The queue holds sets, their corrections, the exercises left out and the end of the workout; each kind has its own route.
export function sendPendingItem(item: PendingItem) {
  switch (item.kind) {
    case 'set':
      return postWorkoutSet(item.workoutId, item.body)
    case 'skip':
      return postWorkoutSkip(item.workoutId, item.body)
    case 'correction':
      return patchWorkoutSet(item.workoutId, item.setId, item.body)
    case 'finish':
      return postWorkoutFinish(item.workoutId, item.body)
  }
}

let appQueue: SyncQueue | null = null

// One queue per page, so a remount or a StrictMode double render never sends from two queues.
function getAppQueue(): SyncQueue {
  appQueue ??= createSyncQueue({
    store: typeof indexedDB === 'undefined' ? createMemoryQueueStore() : createDeferredStore(),
    send: sendPendingItem,
  })
  return appQueue
}

export type SyncProviderProps = {
  // A ready queue, so a test drives the provider without IndexedDB or the network.
  queue?: SyncQueue
  children: ReactNode
}

export function SyncProvider({ queue: injected, children }: SyncProviderProps) {
  const [queue] = useState(() => injected ?? getAppQueue())
  const { pending } = useQueueSnapshot(queue)
  useSyncTriggers(queue, pending.length > 0)
  useEffect(() => {
    void navigator.storage?.persist?.()
  }, [])
  return <SyncQueueContext value={queue}>{children}</SyncQueueContext>
}

export function useSyncQueue(): SyncQueue {
  const queue = useContext(SyncQueueContext)
  if (!queue) throw new Error('useSyncQueue needs a SyncProvider')
  return queue
}

function useQueueSnapshot(queue: SyncQueue): QueueContents {
  return useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot)
}

export function useSyncSnapshot(): QueueContents {
  return useQueueSnapshot(useSyncQueue())
}
