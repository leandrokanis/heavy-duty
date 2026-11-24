'use client'

import { goHome, OfflineNotice } from '@/features/auth/offline-notice'

export default function OfflinePage() {
  return <OfflineNotice onHome={goHome} />
}
