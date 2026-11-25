'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusScreenLayout } from '@/shared/status-screen-layout'

export type OfflineNoticeProps = {
  onRetry?: () => void
  // Off the home page: the installed app has no back button, so the notice offers the way out.
  onHome?: () => void
}

export function goHome() {
  window.location.assign('/')
}

export function OfflineNotice({
  onRetry = () => window.location.reload(),
  onHome,
}: OfflineNoticeProps) {
  return (
    <StatusScreenLayout
      icon="status"
      statusIcon={<WifiOff aria-hidden="true" size={44} strokeWidth={1.8} />}
      title="Sem conexão"
    >
      <div className="flex flex-col gap-(--space-12)">
        <Button variant="secondary" size="large" className="w-full" onClick={onRetry}>
          Tentar de novo
        </Button>
        {onHome ? (
          <Button variant="secondary" size="large" className="w-full" onClick={onHome}>
            Voltar ao treino do dia
          </Button>
        ) : null}
      </div>
    </StatusScreenLayout>
  )
}
