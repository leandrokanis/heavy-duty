'use client'

import { Button } from '@base-ui/react/button'
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { useRef, useState } from 'react'
import { requestSignInOptions, verifySignIn } from './auth-client'

export type SignInScreenProps = {
  onSignedIn: () => void
}

const SIGN_IN_FAILED = 'Não foi possível entrar. Tente de novo.'
const WEBAUTHN_UNSUPPORTED = 'Este navegador não aceita chave de acesso.'

export function SignInScreen({ onSignedIn }: SignInScreenProps) {
  const supported = browserSupportsWebAuthn()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The ref blocks a second tap before React re-renders the disabled button.
  const ceremonyRunning = useRef(false)

  async function signIn() {
    if (ceremonyRunning.current) return
    ceremonyRunning.current = true
    setBusy(true)
    setError(null)
    try {
      const optionsJSON = await requestSignInOptions()
      const response = await startAuthentication({ optionsJSON })
      if (await verifySignIn(response)) {
        onSignedIn()
        return
      }
      setError(SIGN_IN_FAILED)
    } catch {
      setError(SIGN_IN_FAILED)
    } finally {
      ceremonyRunning.current = false
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-(--space-24) px-(--space-margin-inline) py-(--space-24)">
      <h1 className="text-[2rem] font-(--font-weight-semibold)">Heavy Duty</h1>
      {supported ? (
        <Button
          className="min-h-(--target-min) min-w-(--target-min) self-start rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) font-(--font-weight-semibold) text-[Canvas] active:opacity-60 disabled:opacity-40"
          disabled={busy}
          onClick={signIn}
        >
          Entrar
        </Button>
      ) : null}
      <p aria-live="polite" className="min-h-(--target-min)">
        {supported ? error : WEBAUTHN_UNSUPPORTED}
      </p>
    </main>
  )
}
