import { useCallback, useEffect, useRef, useState } from 'react'
import { loadMedals } from '@/sync/medals-cache'
import { useSyncSnapshot } from '@/sync/sync-context'
import type { Medal, Medals } from './medals.types'

export type MedalsAfterSync = {
  medals: Medals | null
  // Awarded since the last read, still to drop from the top.
  awardedNow: Medal[]
  dismiss: () => void
}

// The API awards the medals (ADR-040): each time the queue empties, it holds every set sent, so the
// app reads the medals again and the new ones drop from the top (D104).
export function useMedalsAfterSync(): MedalsAfterSync {
  const queueEmpty = useSyncSnapshot().pending.length === 0
  const [medals, setMedals] = useState<Medals | null>(null)
  const [awardedNow, setAwardedNow] = useState<Medal[]>([])
  const asked = useRef(false)
  useEffect(() => {
    if (!queueEmpty) {
      asked.current = false
      return
    }
    if (asked.current) return
    asked.current = true
    let current = true
    void loadMedals().then((result) => {
      if (!current || result.status !== 'ok') return
      setMedals(result.medals)
      if (result.awardedNow.length > 0) {
        setAwardedNow((shown) => [...shown, ...result.awardedNow])
      }
    })
    return () => {
      current = false
    }
  }, [queueEmpty])
  const dismiss = useCallback(() => setAwardedNow([]), [])
  return { medals, awardedNow, dismiss }
}
