'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthScreenLayout } from './auth-screen-layout'

export type OfflineNoticeProps = {
  onRetry?: () => void
}

export function OfflineNotice({ onRetry = () => window.location.reload() }: OfflineNoticeProps) {
  return (
    <AuthScreenLayout
      icon="status"
      statusIcon={<WifiOff aria-hidden="true" size={44} strokeWidth={1.8} />}
      title="Sem conexão"
    >
      <Button variant="secondary" size="large" className="w-full" onClick={onRetry}>
        Tentar de novo
      </Button>
    </AuthScreenLayout>
  )
}
