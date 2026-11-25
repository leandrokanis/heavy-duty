import { describe, expect, it, vi } from 'vitest'
import type { SendResult } from 'web-push'
import { createWebPushSender, type PushMessage, type PushTarget } from './push-sender.js'

const CONFIG = {
  publicKey: 'test-public-key',
  privateKey: 'test-private-key',
  subject: 'https://heavy-duty.example.test',
}
const TARGET: PushTarget = {
  endpoint: 'https://push.example.test/send/abc',
  keys: { p256dh: 'BPublicKeyOfTheBrowser', auth: 'AuthSecret' },
}
const MESSAGE: PushMessage = {
  title: 'Letra B abre amanhã às 9h',
  body: 'costas, bíceps e lombar',
  tag: 'letter-B',
  url: '/',
  ttlSeconds: 43_200,
}

function failingWith(statusCode: number | undefined, message: string) {
  return vi.fn(async (): Promise<SendResult> => {
    throw Object.assign(new Error(message), { statusCode })
  })
}

describe('Given a web push sender with the VAPID configuration', () => {
  describe('When the push service accepts the message', () => {
    it('Then should send the message as JSON with the VAPID details and the TTL, and return sent', async () => {
      const send = vi.fn(
        async (): Promise<SendResult> => ({ statusCode: 201, body: '', headers: {} }),
      )
      const sender = createWebPushSender(CONFIG, send)

      const outcome = await sender.send(TARGET, MESSAGE)

      expect({ outcome, calls: send.mock.calls }).toEqual({
        outcome: { status: 'sent' },
        calls: [
          [
            TARGET,
            JSON.stringify({
              title: MESSAGE.title,
              body: MESSAGE.body,
              tag: MESSAGE.tag,
              url: '/',
            }),
            {
              vapidDetails: CONFIG,
              TTL: MESSAGE.ttlSeconds,
              urgency: 'normal',
            },
          ],
        ],
      })
    })
  })

  describe.each([404, 410])('When the push service answers %i', (statusCode) => {
    it('Then should return gone', async () => {
      const sender = createWebPushSender(
        CONFIG,
        failingWith(statusCode, 'Received unexpected response code'),
      )

      expect(await sender.send(TARGET, MESSAGE)).toEqual({ status: 'gone' })
    })
  })

  describe('When the push service answers 500', () => {
    it('Then should return failed with the status and without the endpoint', async () => {
      const sender = createWebPushSender(
        CONFIG,
        failingWith(500, `Received unexpected response code from ${TARGET.endpoint}`),
      )

      expect(await sender.send(TARGET, MESSAGE)).toEqual({
        status: 'failed',
        reason: 'push service answered 500',
      })
    })
  })

  describe('When the request fails before an answer', () => {
    it('Then should return failed with a generic reason', async () => {
      const sender = createWebPushSender(
        CONFIG,
        failingWith(undefined, `getaddrinfo ENOTFOUND ${TARGET.endpoint}`),
      )

      expect(await sender.send(TARGET, MESSAGE)).toEqual({
        status: 'failed',
        reason: 'push request failed',
      })
    })
  })
})
