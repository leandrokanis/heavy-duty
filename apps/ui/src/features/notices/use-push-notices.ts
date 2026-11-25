import { useCallback, useEffect, useState } from 'react'
import { deletePushSubscription, fetchPushKey, savePushSubscription } from './push-client'
import type { PushDevice } from './push-device'

export const NOTICE_TEXT = {
  notInstalled: 'Instale o app na tela inicial.',
  unsupported: 'Este aparelho não recebe avisos.',
  notConfigured: 'Avisos não configurados no servidor.',
  offline: 'Sem conexão.',
  signedOut: 'Entre com a sua chave de acesso.',
  denied: 'A permissão dos avisos foi negada nos ajustes do celular.',
  saveFailed: 'Não foi possível ligar os avisos. Tente de novo com conexão.',
} as const

export type NoticesState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'ready'; publicKey: string; on: boolean; busy: boolean; note: string | null }

async function loadNoticesState(device: PushDevice): Promise<NoticesState> {
  const support = device.support()
  if (support === 'not-installed') return { kind: 'unavailable', reason: NOTICE_TEXT.notInstalled }
  if (support === 'unsupported' || !(await device.hasWorker())) {
    return { kind: 'unavailable', reason: NOTICE_TEXT.unsupported }
  }
  const key = await fetchPushKey()
  if (key.status === 'offline') return { kind: 'unavailable', reason: NOTICE_TEXT.offline }
  if (key.status === 'unauthenticated') {
    return { kind: 'unavailable', reason: NOTICE_TEXT.signedOut }
  }
  if (!key.pushKey.configured || key.pushKey.publicKey === null) {
    return { kind: 'unavailable', reason: NOTICE_TEXT.notConfigured }
  }
  const permission = device.permission()
  const subscription = await device.getSubscription()
  return {
    kind: 'ready',
    publicKey: key.pushKey.publicKey,
    on: permission === 'granted' && subscription !== null,
    busy: false,
    note: permission === 'denied' ? NOTICE_TEXT.denied : null,
  }
}

async function turnOn(
  device: PushDevice,
  publicKey: string,
  permissionAsked: Promise<NotificationPermission>,
): Promise<{ on: boolean; note: string | null }> {
  const permission = await permissionAsked
  if (permission !== 'granted') {
    return { on: false, note: permission === 'denied' ? NOTICE_TEXT.denied : null }
  }
  try {
    const subscription = await device.subscribe(publicKey)
    const body = subscription.body()
    if (body && (await savePushSubscription(body)) === 'ok') return { on: true, note: null }
    await subscription.unsubscribe().catch(() => {})
  } catch {
    // The push service refused the subscription; the switch stays off with the note.
  }
  return { on: false, note: NOTICE_TEXT.saveFailed }
}

// Offline, the API keeps the row until the push service answers 410 for it (ADR-035).
async function turnOff(device: PushDevice): Promise<{ on: boolean; note: null }> {
  const subscription = await device.getSubscription()
  if (subscription) {
    await deletePushSubscription(subscription.endpoint)
    await subscription.unsubscribe().catch(() => {})
  }
  return { on: false, note: null }
}

export function usePushNotices(
  open: boolean,
  device: PushDevice,
): { state: NoticesState; toggle: () => void } {
  const [state, setState] = useState<NoticesState>({ kind: 'loading' })

  useEffect(() => {
    if (!open) return
    let current = true
    setState({ kind: 'loading' })
    loadNoticesState(device)
      .catch((): NoticesState => ({ kind: 'unavailable', reason: NOTICE_TEXT.unsupported }))
      .then((loaded) => {
        if (current) setState(loaded)
      })
    return () => {
      current = false
    }
  }, [open, device])

  const toggle = useCallback(() => {
    if (state.kind !== 'ready' || state.busy) return
    // Safari grants the permission only to a request made inside the tap (D44).
    const change = state.on
      ? turnOff(device)
      : turnOn(device, state.publicKey, device.requestPermission())
    setState({ ...state, busy: true })
    change.then((next) => setState({ ...state, ...next, busy: false }))
  }, [state, device])

  return { state, toggle }
}

// Safari may renew the subscription without pushsubscriptionchange, so each opening sends it again.
export async function resyncPushSubscription(device: PushDevice): Promise<void> {
  try {
    if (device.support() !== 'supported' || device.permission() !== 'granted') return
    const body = (await device.getSubscription())?.body()
    if (body) await savePushSubscription(body)
  } catch {
    // The next opening tries again.
  }
}
