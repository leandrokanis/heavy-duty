import { useEffect, useRef, useState } from 'react'
import { fetchCurrentPeriod } from '@/features/period/period-client'
import { storePeriod } from '@/sync/period-cache'
import { useSyncSnapshot } from '@/sync/sync-context'
import { rankInPeriodOf, type WorkoutRank } from './workout-rank'

// When the queue empties, the API holds every set of the workout: its rank replaces the provisional
// one (ADR-034). A new item in the queue, as a correction, brings the provisional one back.
export function useWorkoutRankFromApi(ready: boolean, workoutId: string): WorkoutRank | null {
  const queueEmpty = useSyncSnapshot().pending.length === 0
  const [rank, setRank] = useState<WorkoutRank | null>(null)
  const asked = useRef(false)
  useEffect(() => {
    if (!queueEmpty) {
      asked.current = false
      setRank(null)
      return
    }
    if (!ready || asked.current) return
    asked.current = true
    let current = true
    void fetchCurrentPeriod().then((result) => {
      if (!current || result.status !== 'ok') return
      void storePeriod(result.period)
      setRank(rankInPeriodOf(result.period, workoutId))
    })
    return () => {
      current = false
    }
  }, [ready, queueEmpty, workoutId])
  return rank
}
