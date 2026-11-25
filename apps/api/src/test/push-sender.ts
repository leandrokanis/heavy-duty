import type {
  PushMessage,
  PushOutcome,
  PushSender,
  PushTarget,
} from '../modules/notifications/push-sender.js'

export type FakePushSender = PushSender & {
  sent: { target: PushTarget; message: PushMessage }[]
}

// Answers by endpoint, sent by default; records every message it receives.
export function createFakePushSender(outcomes: Record<string, PushOutcome> = {}): FakePushSender {
  const sent: FakePushSender['sent'] = []
  return {
    sent,
    async send(target, message) {
      sent.push({ target, message })
      return outcomes[target.endpoint] ?? { status: 'sent' }
    },
  }
}
