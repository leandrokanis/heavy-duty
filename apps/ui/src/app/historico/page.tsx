'use client'

import { Suspense } from 'react'
import { HistoryScreen } from '@/features/history/history-screen'

// useSearchParams needs a Suspense boundary to prerender, see the Next.js App Router docs.
export default function HistoryPage() {
  return (
    <Suspense fallback={<main aria-busy="true" className="flex-1" />}>
      <HistoryScreen />
    </Suspense>
  )
}
