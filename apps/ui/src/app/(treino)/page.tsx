'use client'

import { TodayScreen } from '@/features/workout/today-screen'
import { SyncProvider } from '@/sync/sync-context'

export default function TodayPage() {
  return (
    <SyncProvider>
      <TodayScreen />
    </SyncProvider>
  )
}
