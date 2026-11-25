import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../../test/database.js'
import { createFakePushSender } from '../../test/push-sender.js'
import type { PushMessage } from './push-sender.js'
import { listPushSubscriptions } from './push-subscription.repository.js'
import { savePushSubscription, sendPushToAll } from './push-subscription.service.js'

const NOW = new Date('2026-11-25T12:00:00.000Z')
const PHONE = 'https://push.example.test/send/phone'
const OLD_PHONE = 'https://push.example.test/send/old-phone'
const LAPTOP = 'https://push.example.test/send/laptop'
const KEYS = { p256dh: 'BPublicKeyOfTheBrowser', auth: 'AuthSecret' }
const MESSAGE: PushMessage = {
  title: 'Letra B abre amanhã às 9h',
  body: 'costas, bíceps e lombar',
  tag: 'letter-B',
  url: '/',
  ttlSeconds: 43_200,
}

describe('Given three push subscriptions', () => {
  function givenSubscriptions() {
    const db = createTestDatabase()
    for (const endpoint of [PHONE, OLD_PHONE, LAPTOP]) {
      savePushSubscription(db, { endpoint, keys: KEYS }, NOW)
    }
    return db
  }

  describe('When a message goes to all and the push service says one is gone and one failed', () => {
    it('Then should send to the three, remove the gone one and count each outcome', async () => {
      const db = givenSubscriptions()
      const sender = createFakePushSender({
        [OLD_PHONE]: { status: 'gone' },
        [LAPTOP]: { status: 'failed', reason: 'push service answered 500' },
      })

      const result = await sendPushToAll(db, sender, MESSAGE)

      expect({
        result,
        sentTo: sender.sent.map(({ target }) => target.endpoint).sort(),
        left: listPushSubscriptions(db)
          .map(({ endpoint }) => endpoint)
          .sort(),
      }).toEqual({
        result: { sent: 1, gone: 1, failures: ['push service answered 500'] },
        sentTo: [LAPTOP, OLD_PHONE, PHONE].sort(),
        left: [LAPTOP, PHONE].sort(),
      })
    })
  })
})

describe('Given no push subscription', () => {
  describe('When a message goes to all', () => {
    it('Then should send nothing', async () => {
      const sender = createFakePushSender()

      const result = await sendPushToAll(createTestDatabase(), sender, MESSAGE)

      expect({ result, sent: sender.sent.length }).toEqual({
        result: { sent: 0, gone: 0, failures: [] },
        sent: 0,
      })
    })
  })
})
