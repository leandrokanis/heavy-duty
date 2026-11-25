import { describe, expect, it } from 'vitest'
import { createFakeMailSender } from '../../test/mail-sender.js'
import { createEmailChannel, LEVEL_DROP_EMAIL_SKIPPED } from './email-channel.js'
import type { Notice } from './notices.rules.js'

const OPTIONS = { appOrigin: 'https://heavy.example.com', timeZone: 'America/Sao_Paulo' }

const QUADRICEPS_DROP: Notice = {
  key: 'level_drop:quadriceps:2026-11-27T17:00:00.000Z',
  kind: 'level_drop',
  letter: 'C',
  groups: [{ slug: 'quadriceps', name: 'quadríceps' }],
  eventAtMs: Date.parse('2026-11-27T17:00:00.000Z'),
  dueAtMs: Date.parse('2026-11-26T17:00:00.000Z'),
  level: { now: 7, after: 6 },
}

describe('Given the level drop notice of quadriceps', () => {
  describe('When the email channel delivers it', () => {
    it('Then should send no email and record it as skipped', async () => {
      const mail = createFakeMailSender()

      const result = await createEmailChannel(mail, OPTIONS).deliver(
        QUADRICEPS_DROP,
        QUADRICEPS_DROP.dueAtMs,
      )

      expect([result, mail.sent.length]).toEqual([
        { status: 'skipped', error: LEVEL_DROP_EMAIL_SKIPPED },
        0,
      ])
    })
  })
})

describe('Given a mail sender that fails with an unexpected error', () => {
  describe('When the email channel delivers a window notice', () => {
    it('Then should let the scheduler record the failure', async () => {
      const channel = createEmailChannel(
        {
          send: async () => {
            throw new Error('bug')
          },
        },
        OPTIONS,
      )

      await expect(
        channel.deliver({ ...QUADRICEPS_DROP, kind: 'window_open' }, QUADRICEPS_DROP.dueAtMs),
      ).rejects.toThrow('bug')
    })
  })
})
