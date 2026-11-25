import { describe, expect, it } from 'vitest'
import { pushMessageOf } from './notice-format.js'
import type { Notice } from './notices.rules.js'

const SAO_PAULO = 'America/Sao_Paulo'
const at = (iso: string) => Date.parse(iso)

function notice(overrides: Partial<Notice>): Notice {
  return {
    key: 'k',
    kind: 'window_open',
    letter: 'B',
    groups: [
      { slug: 'back', name: 'costas' },
      { slug: 'biceps', name: 'bíceps' },
      { slug: 'lower-back', name: 'lombar' },
    ],
    eventAtMs: at('2026-11-26T12:00:00.000Z'),
    dueAtMs: at('2026-11-26T00:00:00.000Z'),
    ...overrides,
  }
}

describe('Given the opening notice of letter B, tomorrow at 9h', () => {
  describe('When it becomes a push message at 21h today', () => {
    it('Then should name the letter, the day and the time, list the groups and live until the opening', () => {
      expect(pushMessageOf(notice({}), at('2026-11-26T00:00:00.000Z'), SAO_PAULO)).toEqual({
        title: 'Letra B abre amanhã às 9h',
        body: 'Costas, bíceps e lombar entram em janela. Pontos em dobro.',
        tag: 'letter-B',
        url: '/',
        ttlSeconds: 12 * 60 * 60,
      })
    })
  })
})

describe('Given the closing notice of letter B, today at 20h, for back only', () => {
  describe('When it becomes a push message at 8h', () => {
    it('Then should say the letter closes today at 20h, with the verb in the singular', () => {
      const closing = notice({
        kind: 'window_close',
        groups: [{ slug: 'back', name: 'costas' }],
        eventAtMs: at('2026-11-25T23:00:00.000Z'),
      })

      const message = pushMessageOf(closing, at('2026-11-25T11:00:00.000Z'), SAO_PAULO)

      expect([message.title, message.body, message.tag]).toEqual([
        'Letra B fecha hoje às 20h',
        'Costas sai da janela. Treine antes para pontos em dobro.',
        'letter-B',
      ])
    })
  })
})

describe('Given quadriceps drops from level 7 to 6 tomorrow at 14h, trained by letter C', () => {
  describe('When it becomes a push message', () => {
    it('Then should give the level now, the level after and the letter', () => {
      const drop = notice({
        kind: 'level_drop',
        letter: 'C',
        groups: [{ slug: 'quadriceps', name: 'quadríceps' }],
        eventAtMs: at('2026-11-27T17:00:00.000Z'),
        level: { now: 7, after: 6 },
      })

      const message = pushMessageOf(drop, at('2026-11-26T17:00:00.000Z'), SAO_PAULO)

      expect([message.title, message.body, message.tag]).toEqual([
        'Quadríceps cai para o nível 6 amanhã às 14h',
        'Nível 7 agora. A letra C recupera em dobro.',
        'drop-quadriceps',
      ])
    })
  })
})
