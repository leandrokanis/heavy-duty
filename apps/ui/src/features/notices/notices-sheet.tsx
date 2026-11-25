'use client'

import { Bell, BellOff } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { browserPushDevice, type PushDevice } from './push-device'
import { usePushNotices } from './use-push-notices'

export type NoticesSheetProps = {
  open: boolean
  onClose: () => void
  device?: PushDevice
}

export function NoticesSheet({ open, onClose, device = browserPushDevice }: NoticesSheetProps) {
  const { state, toggle } = usePushNotices(open, device)
  const noteId = useId()
  const on = state.kind === 'ready' && state.on
  const note =
    state.kind === 'unavailable' ? state.reason : state.kind === 'ready' ? state.note : null

  return (
    <Sheet.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Sheet.Title>Avisos</Sheet.Title>
      <Sheet.Body>
        <p className="m-0 mb-(--space-16) text-(--color-label-secondary)">
          Perto de a janela de uma letra abrir e fechar e antes de um grupo cair de nível.
        </p>
        <Button
          variant="secondary"
          size="workout"
          className="w-full"
          aria-pressed={on}
          aria-describedby={note ? noteId : undefined}
          aria-busy={state.kind === 'loading' || (state.kind === 'ready' && state.busy)}
          disabled={state.kind !== 'ready' || state.busy}
          focusableWhenDisabled
          icon={on ? Bell : BellOff}
          onClick={toggle}
        >
          Avisos no celular
        </Button>
        {note ? (
          <p
            id={noteId}
            className="m-0 mt-(--space-12) text-(--color-label-secondary) text-(length:--font-size-footnote)"
          >
            {note}
          </p>
        ) : null}
      </Sheet.Body>
      <Sheet.Actions>
        <Button variant="secondary" size="workout" className="col-span-2" onClick={onClose}>
          Fechar
        </Button>
      </Sheet.Actions>
    </Sheet.Root>
  )
}
