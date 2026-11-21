'use client'

import { Button } from '@base-ui/react/button'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import { useEffect, useRef, useState } from 'react'
import { type EnrollmentFailure, requestEnrollmentOptions, verifyEnrollment } from './auth-client'

const MESSAGES: Record<EnrollmentFailure | 'unsupported', string> = {
  enrollment_token_invalid: 'Link de cadastro inválido ou vencido. Gere outro link no servidor.',
  enrollment_failed: 'Não foi possível criar a chave de acesso. Tente de novo.',
  unsupported: 'Este navegador não aceita chave de acesso.',
}

// The token travels in the fragment so it never reaches the proxy or tunnel logs, see ADR-019.
function readTokenFromFragment(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('token')
}

export function EnrollmentScreen() {
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<keyof typeof MESSAGES | null>(null)
  const ceremonyRunning = useRef(false)

  useEffect(() => {
    const fragmentToken = readTokenFromFragment()
    setToken(fragmentToken)
    if (!fragmentToken) setFailure('enrollment_token_invalid')
    else if (!browserSupportsWebAuthn()) setFailure('unsupported')
  }, [])

  async function enroll() {
    if (!token || ceremonyRunning.current) return
    ceremonyRunning.current = true
    setBusy(true)
    setFailure(null)
    try {
      const options = await requestEnrollmentOptions(token)
      if (!options.ok) {
        setFailure(options.code)
        return
      }
      const response = await startRegistration({ optionsJSON: options.value })
      const verified = await verifyEnrollment(token, response)
      if (!verified.ok) {
        setFailure(verified.code)
        return
      }
      window.location.replace('/')
    } catch {
      setFailure('enrollment_failed')
    } finally {
      ceremonyRunning.current = false
      setBusy(false)
    }
  }

  const canEnroll = Boolean(token) && failure !== 'unsupported'

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-(--space-24) px-(--space-margin-inline) py-(--space-24)">
      <h1 className="text-[2rem] font-(--font-weight-semibold)">Heavy Duty</h1>
      {canEnroll ? (
        <Button
          className="min-h-(--target-min) min-w-(--target-min) self-start rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) font-(--font-weight-semibold) text-[Canvas] active:opacity-60 disabled:opacity-40"
          disabled={busy}
          onClick={enroll}
        >
          Criar chave de acesso
        </Button>
      ) : null}
      <p aria-live="polite" className="min-h-(--target-min)">
        {failure ? MESSAGES[failure] : null}
      </p>
    </main>
  )
}
