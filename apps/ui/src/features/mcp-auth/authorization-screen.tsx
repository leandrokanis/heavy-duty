'use client'

import { Button } from '@base-ui/react/button'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
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

const BUTTON_BASE =
  'min-h-(--target-min) min-w-(--target-min) flex-1 rounded-(--radius-capsule) px-(--space-20) font-(--font-weight-semibold) active:opacity-60 disabled:opacity-40'

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

  if (state.kind === 'loading') return <main aria-busy="true" className="min-h-dvh" />
  if (state.kind === 'offline') return <OfflineNotice onRetry={loadPreview} />
  if (state.kind === 'refused') {
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-(--space-24) px-(--space-margin-inline) py-(--space-24)">
        <h1 className="text-[2rem] font-(--font-weight-semibold)">Autorizar acesso ao MCP</h1>
        <p role="alert">{state.message}</p>
      </main>
    )
  }
  const consent = state

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-(--space-24) px-(--space-margin-inline) py-(--space-24)">
      <h1 className="text-[2rem] font-(--font-weight-semibold)">Autorizar acesso ao MCP</h1>
      <section className="flex flex-col gap-(--space-8)">
        <p className="text-[1.5rem] font-(--font-weight-semibold) break-all">
          {consent.redirectHost}
        </p>
        <p>pede acesso para administrar o Heavy Duty pelo Claude.</p>
        {consent.clientName ? (
          <p className="text-[0.9375rem]">Nome declarado pelo cliente: {consent.clientName}</p>
        ) : null}
      </section>
      <div className="flex gap-(--space-8)">
        <Button
          className={`${BUTTON_BASE} border border-current`}
          disabled={busy}
          onClick={() => decide('deny')}
        >
          Recusar
        </Button>
        <Button
          className={`${BUTTON_BASE} bg-[CanvasText] text-[Canvas]`}
          disabled={busy}
          onClick={() => decide('approve')}
        >
          Permitir
        </Button>
      </div>
    </main>
  )
}
