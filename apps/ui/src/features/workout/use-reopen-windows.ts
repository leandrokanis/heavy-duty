'use client'

import { useEffect, useRef, useState } from 'react'
import { useSyncSnapshot } from '@/sync/sync-context'
import type { ActivityWindows } from './windows.types'
import { fetchWindows } from './windows-client'

// Asks the API for the windows once, when the send queue is empty and the workout is fully queued
// (`ready`). The cached copy is never used: the reopening must come from the server (FR-2).
export function useReopenWindows(ready: boolean): ActivityWindows | null {
  const queueEmpty = useSyncSnapshot().pending.length === 0
  const [windows, setWindows] = useState<ActivityWindows | null>(null)
  const asked = useRef(false)
  useEffect(() => {
    if (!ready || !queueEmpty || asked.current) return
    asked.current = true
    void fetchWindows().then((result) => {
      if (result.status === 'ok') setWindows(result.windows)
    })
  }, [ready, queueEmpty])
  return windows
}
