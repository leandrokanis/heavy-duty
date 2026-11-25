'use client'

import { MailCheck, MailX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusScreenLayout } from '@/shared/status-screen-layout'
import { turnEmailsOff } from './email-opt-out-client'

type Failure = 'invalid_link' | 'request_failed'

const MESSAGES: Record<Failure, string> = {
  invalid_link: 'Link de desligar inválido. Abra de novo o link do e-mail.',
  request_failed: 'Não foi possível desligar os e-mails. Tente de novo.',
}

const PHONE_NOTICES_GO_ON = 'Os avisos no celular continuam.'

const ICON_PROPS = { 'aria-hidden': true, size: 44, strokeWidth: 1.8 } as const

// The token travels in the fragment so it never reaches the proxy or tunnel logs, see ADR-037.
function readTokenFromFragment(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('token')
}

// Opening the page turns nothing off: email filters open links on their own (D90).
export function EmailOptOutScreen() {
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [isOff, setIsOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const requestRunning = useRef(false)

  useEffect(() => {
    const fragmentToken = readTokenFromFragment()
    setToken(fragmentToken)
    if (!fragmentToken) setFailure('invalid_link')
  }, [])

  async function turnOff() {
    if (!token || requestRunning.current) return
    requestRunning.current = true
    setBusy(true)
    setFailure(null)
    try {
      if (await turnEmailsOff(token)) setIsOff(true)
      else setFailure('request_failed')
    } finally {
      requestRunning.current = false
      setBusy(false)
    }
  }

  if (isOff) {
    return (
      <StatusScreenLayout
        icon="status"
        statusIcon={<MailCheck {...ICON_PROPS} />}
        title="E-mails desligados"
      >
        <p className="m-0 text-center text-(--color-label-secondary)">{PHONE_NOTICES_GO_ON}</p>
      </StatusScreenLayout>
    )
  }

  return (
    <StatusScreenLayout
      icon="status"
      statusIcon={<MailX {...ICON_PROPS} />}
      title="Desligar e-mails"
      message={failure ? MESSAGES[failure] : null}
    >
      <div className="flex flex-col gap-(--space-24)">
        <p className="m-0 text-center text-(--color-label-secondary)">
          Você deixa de receber os avisos por e-mail. {PHONE_NOTICES_GO_ON}
        </p>
        {token ? (
          <Button size="large" className="w-full" disabled={busy} onClick={turnOff}>
            Desligar e-mails
          </Button>
        ) : null}
      </div>
    </StatusScreenLayout>
  )
}
