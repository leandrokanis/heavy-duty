'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { hasCachedToday } from '@/sync/today-cache'
import { fetchSession, type SessionState } from './auth-client'
import { goHome, OfflineNotice } from './offline-notice'
import { SignInScreen } from './sign-in-screen'

// The enrollment link and the offline fallback must open before any passkey exists.
const OPEN_PATHS: ReadonlySet<string> = new Set(['/cadastro', '/~offline'])

export type AuthGateProps = {
  children: ReactNode
}

// The pages that read only the copies on the device, so they open without signal (ADR-021).
const OFFLINE_PATHS: ReadonlySet<string> = new Set(['/', '/mapa'])

// Without signal these pages still open when the device holds a copy of the workout of the day,
// which only exists after a 200 with a session; the API stays the security boundary (FR-013).
async function resolveOffline(pathname: string): Promise<SessionState> {
  return OFFLINE_PATHS.has(pathname) && (await hasCachedToday()) ? 'authenticated' : 'offline'
}

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname()
  const isOpenPath = OPEN_PATHS.has(pathname)
  const [session, setSession] = useState<SessionState | 'pending'>('pending')

  const checkSession = useCallback(() => {
    setSession('pending')
    fetchSession()
      .then((state) => (state === 'offline' ? resolveOffline(pathname) : state))
      .then(setSession)
  }, [pathname])

  useEffect(() => {
    if (!isOpenPath) checkSession()
  }, [isOpenPath, checkSession])

  if (isOpenPath || session === 'authenticated') return children
  if (session === 'unauthenticated') {
    return <SignInScreen onSignedIn={() => setSession('authenticated')} />
  }
  if (session === 'offline') {
    return <OfflineNotice onRetry={checkSession} onHome={pathname === '/' ? undefined : goHome} />
  }
  return <main aria-busy="true" className="flex-1" />
}
