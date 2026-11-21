import { useEffect } from 'react'
import { SYNC_RETRY_INTERVAL_MS } from './sync.config'
import type { SyncQueue } from './sync-queue'

// navigator.onLine lies on weak signal, so the events and the interval only start a flush;
// the answer of the API is what takes a set out of the queue.
export function useSyncTriggers(queue: SyncQueue, hasPending: boolean): void {
  useEffect(() => {
    void queue.flush()
    const flush = () => void queue.flush()
    const onVisible = () => {
      if (document.visibilityState === 'visible') flush()
    }
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [queue])

  useEffect(() => {
    if (!hasPending) return
    const interval = setInterval(() => void queue.flush(), SYNC_RETRY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [queue, hasPending])
}
