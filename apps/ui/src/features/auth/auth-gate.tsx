'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { fetchSession, type SessionState } from './auth-client'
import { OfflineNotice } from './offline-notice'
import { SignInScreen } from './sign-in-screen'

// The enrollment link and the offline fallback must open before any passkey exists.
const OPEN_PATHS: ReadonlySet<string> = new Set(['/cadastro', '/~offline'])

export type AuthGateProps = {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const isOpenPath = OPEN_PATHS.has(usePathname())
  const [session, setSession] = useState<SessionState | 'pending'>('pending')

  const checkSession = useCallback(() => {
    setSession('pending')
    fetchSession().then(setSession)
  }, [])

  useEffect(() => {
    if (!isOpenPath) checkSession()
  }, [isOpenPath, checkSession])

  if (isOpenPath || session === 'authenticated') return children
  if (session === 'unauthenticated') {
    return <SignInScreen onSignedIn={() => setSession('authenticated')} />
  }
  if (session === 'offline') return <OfflineNotice onRetry={checkSession} />
  return <main aria-busy="true" className="min-h-dvh" />
}
