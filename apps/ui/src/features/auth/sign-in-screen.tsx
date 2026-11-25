'use client'

import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { Lock } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusScreenLayout } from '@/shared/status-screen-layout'
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
    <StatusScreenLayout
      icon="app"
      title="Heavy Duty"
      message={supported ? error : WEBAUTHN_UNSUPPORTED}
    >
      {supported ? (
        <Button size="large" icon={Lock} className="w-full" disabled={busy} onClick={signIn}>
          Entrar
        </Button>
      ) : null}
    </StatusScreenLayout>
  )
}
