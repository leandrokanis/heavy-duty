'use client'

import { CircleAlert } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { OfflineNotice } from '@/features/auth/offline-notice'
import {
  type AuthorizationDecision,
  type AuthorizationPreview,
  fetchAuthorizationPreview,
  sendAuthorizationDecision,
} from './authorization-client'

type ScreenState =
  | { kind: 'loading' }
  | Extract<AuthorizationPreview, { kind: 'consent' | 'refused' | 'offline' }>

const MAIN_CLASS =
  'mx-auto flex flex-1 w-full max-w-[640px] flex-col justify-center px-(--space-margin-inline) py-(--space-24)'
const TITLE_CLASS =
  'm-0 font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight)'

export function AuthorizationScreen() {
  const query = useSearchParams().toString()
  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const deciding = useRef(false)

  const loadPreview = useCallback(() => {
    setState({ kind: 'loading' })
    fetchAuthorizationPreview(query).then((preview) => {
      if (preview.kind === 'error_redirect') window.location.assign(preview.redirectTo)
      else setState(preview)
    })
  }, [query])

  useEffect(loadPreview, [loadPreview])

  async function decide(decision: AuthorizationDecision) {
    if (deciding.current) return
    deciding.current = true
    setBusy(true)
    const result = await sendAuthorizationDecision(query, decision)
    if (result.kind === 'redirect') {
      window.location.assign(result.redirectTo)
      return
    }
    deciding.current = false
    setBusy(false)
    setState(result)
  }

  if (state.kind === 'loading') return <main aria-busy="true" className="flex-1" />
  if (state.kind === 'offline') return <OfflineNotice onRetry={loadPreview} />
  if (state.kind === 'refused') {
    return (
      <main className={MAIN_CLASS}>
        <h1 className={TITLE_CLASS}>Autorizar acesso ao MCP</h1>
        <p
          role="alert"
          className="m-0 mt-(--space-24) flex items-start gap-(--space-8) text-(--color-danger)"
        >
          <CircleAlert aria-hidden="true" size={22} strokeWidth={1.8} className="shrink-0" />
          <span>{state.message}</span>
        </p>
      </main>
    )
  }
  const consent = state

  return (
    <main className={MAIN_CLASS}>
      <h1 className={TITLE_CLASS}>Autorizar acesso ao MCP</h1>
      <section className="mt-(--space-24) rounded-(--radius-card) bg-(--color-background-grouped) p-(--space-16)">
        <p className="m-0 break-all font-(--font-weight-bold) text-(length:--font-size-title-3)">
          {consent.redirectHost}
        </p>
        <p className="m-0 mt-(--space-4) text-(length:--font-size-body)">
          pede acesso para administrar o Heavy Duty pelo Claude.
        </p>
        {consent.clientName ? (
          <p className="m-0 mt-(--space-8) text-(--color-label-secondary) text-(length:--font-size-subheadline)">
            Nome declarado pelo cliente: {consent.clientName}
          </p>
        ) : null}
      </section>
      <div className="mt-(--space-24) grid grid-cols-2 gap-(--space-12)">
        <Button variant="secondary" size="workout" disabled={busy} onClick={() => decide('deny')}>
          Recusar
        </Button>
        <Button size="workout" disabled={busy} onClick={() => decide('approve')}>
          Permitir
        </Button>
      </div>
    </main>
  )
}
