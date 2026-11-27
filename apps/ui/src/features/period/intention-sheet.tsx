'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import type { CurrentPeriod } from './period.types'
import { type IntentionResult, saveIntention } from './period-client'

export const MAX_INTENTION_LENGTH = 120

const OFFLINE = 'Sem conexão. A frase não foi salva.'
const SIGNED_OUT = 'A sessão de acesso terminou. Entre de novo para salvar a frase.'

export type IntentionSheetProps = {
  open: boolean
  intention: string | null
  onClose: () => void
  onSaved: (period: CurrentPeriod) => void
  save?: (intention: string) => Promise<IntentionResult>
}

function errorOf(result: Exclude<IntentionResult, { status: 'ok' }>): string {
  if (result.status === 'offline') return OFFLINE
  if (result.status === 'unauthenticated') return SIGNED_OUT
  return `${result.message.charAt(0).toUpperCase()}${result.message.slice(1)}.`
}

// Written only with signal and sent straight to the API; an empty text removes the intention
// (D98).
export function IntentionSheet({
  open,
  intention,
  onClose,
  onSaved,
  save = saveIntention,
}: IntentionSheetProps) {
  const [text, setText] = useState(intention ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const counterId = useId()

  useEffect(() => {
    if (open) {
      setText(intention ?? '')
      setError(null)
    }
  }, [open, intention])

  const submit = async () => {
    setSaving(true)
    setError(null)
    const result = await save(text)
    setSaving(false)
    if (result.status === 'ok') onSaved(result.period)
    else setError(errorOf(result))
  }

  return (
    <Sheet.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Sheet.Title>Frase de intenção</Sheet.Title>
      <Sheet.Body>
        <p className="m-0 text-(--color-label-secondary) text-(length:--font-size-callout)">
          O que você quer deste período?
        </p>
        <textarea
          aria-label="Frase de intenção"
          aria-describedby={counterId}
          maxLength={MAX_INTENTION_LENGTH}
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="mt-(--space-12) block w-full resize-none rounded-(--radius-inner) border-0 bg-(--color-fill) px-(--space-16) py-(--space-12) text-(--color-label) text-(length:--font-size-body)"
        />
        <p
          id={counterId}
          className="m-0 mt-(--space-8) text-right text-(--color-label-secondary) text-(length:--font-size-footnote) tabular-nums"
        >
          {`${[...text].length} de ${MAX_INTENTION_LENGTH} caracteres`}
        </p>
        <p role="alert" className="m-0 text-(--color-danger) text-(length:--font-size-callout)">
          {error ?? ''}
        </p>
      </Sheet.Body>
      <Sheet.Actions>
        <Button variant="secondary" size="large" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="large" disabled={saving} onClick={() => void submit()}>
          Salvar
        </Button>
      </Sheet.Actions>
    </Sheet.Root>
  )
}
