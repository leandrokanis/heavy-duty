'use client'

import { Button } from '@base-ui/react/button'

export type OfflineNoticeProps = {
  onRetry?: () => void
}

export function OfflineNotice({ onRetry = () => window.location.reload() }: OfflineNoticeProps) {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-(--space-16) px-(--space-margin-inline) py-(--space-24)">
      <h1 className="text-[2rem] font-(--font-weight-semibold)">Sem conexão</h1>
      <Button
        className="min-h-(--target-min) min-w-(--target-min) self-start rounded-(--radius-capsule) border border-current px-(--space-20) font-(--font-weight-semibold) active:opacity-60"
        onClick={onRetry}
      >
        Tentar de novo
      </Button>
    </main>
  )
}
