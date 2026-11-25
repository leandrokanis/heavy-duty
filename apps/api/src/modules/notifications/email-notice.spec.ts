import { describe, expect, it } from 'vitest'
import { type NoticeEmailContent, noticeEmailContentOf, renderNoticeEmail } from './email-notice.js'
import type { Notice } from './notices.rules.js'

const APP_ORIGIN = 'https://heavy.example.com'
const TOKEN = 'token-123'
const LINKS = { appOrigin: APP_ORIGIN, unsubscribeToken: TOKEN }
const SAO_PAULO = 'America/Sao_Paulo'

// Opens tomorrow at 9h in São Paulo; the notice goes out at 21h today.
const OPENING_OF_B: Notice = {
  key: 'window_open:B:2026-11-26T12:00:00.000Z',
  kind: 'window_open',
  letter: 'B',
  groups: [
    { slug: 'back', name: 'costas' },
    { slug: 'biceps', name: 'bíceps' },
    { slug: 'lower-back', name: 'lombar' },
  ],
  eventAtMs: Date.parse('2026-11-26T12:00:00.000Z'),
  dueAtMs: Date.parse('2026-11-26T00:00:00.000Z'),
}
const NOTICE_AT_MS = Date.parse('2026-11-26T00:00:00.000Z')

describe('Given the opening notice of letter B, whose back, biceps and lower back open tomorrow at 9h', () => {
  describe('When the email content is made at 21h', () => {
    it('Then should reuse the title and the body of the push notice, with the letter and the three groups', () => {
      expect(noticeEmailContentOf(OPENING_OF_B, NOTICE_AT_MS, SAO_PAULO)).toEqual({
        title: 'Letra B abre amanhã às 9h',
        body: 'Costas, bíceps e lombar entram em janela. Pontos em dobro.',
        letter: 'B',
        groups: ['Costas', 'Bíceps', 'Lombar'],
        levels: null,
      })
    })
  })
})

const CONTENT: NoticeEmailContent = {
  title: 'Letra B abre amanhã às 9h',
  body: 'Costas, bíceps e lombar entram em janela. Pontos em dobro.',
  letter: 'B',
  groups: ['Costas', 'Bíceps', 'Lombar'],
  levels: null,
}

describe('Given the email content of the window notice of letter B', () => {
  describe('When the email is rendered', () => {
    const email = renderNoticeEmail(CONTENT, LINKS)

    it('Then should use the title of the notice as the subject', () => {
      expect(email.subject).toBe('Letra B abre amanhã às 9h')
    })

    it('Then should show the title, the three groups, the letter and the body in the text', () => {
      expect(email.text).toContain('Letra B abre amanhã às 9h\n')
      expect(email.text).toContain('Costas · Bíceps · Lombar')
      expect(email.text).toContain('Letra B\nCostas, bíceps e lombar entram em janela.')
    })

    it('Then should show the title, the groups, the letter and the body in the HTML', () => {
      for (const part of [
        '>Letra B abre amanhã às 9h</h1>',
        '>Costas</span>',
        '>Bíceps</span>',
        '>Lombar</span>',
        '<strong>Letra B</strong>',
        'Costas, bíceps e lombar entram em janela. Pontos em dobro.',
      ]) {
        expect(email.html).toContain(part)
      }
    })

    it('Then should link the button "Abrir o app" to the app', () => {
      expect(email.html).toContain(`href="${APP_ORIGIN}/"`)
      expect(email.html).toContain('Abrir o app')
      expect(email.text).toContain(`Abrir o app: ${APP_ORIGIN}/`)
    })

    it('Then should end with the link to turn the emails off and say the phone notices go on', () => {
      const pageUrl = `${APP_ORIGIN}/desligar-emails#token=${TOKEN}`
      expect(email.html).toContain(`href="${pageUrl}"`)
      expect(email.html).toContain('Desligar e-mails')
      expect(email.html).toContain('Os avisos no celular continuam.')
      expect(email.text).toContain(`Desligar e-mails: ${pageUrl}`)
      expect(email.text).toContain('Os avisos no celular continuam.')
    })

    it('Then should carry the one-click unsubscribe headers of RFC 8058', () => {
      expect(email.headers).toEqual({
        'List-Unsubscribe': `<${APP_ORIGIN}/api/email/unsubscribe?token=${TOKEN}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      })
    })

    it('Then should carry no load, no reps and no history (ADR-007)', () => {
      expect(`${email.text}${email.html}`).not.toMatch(/\d kg|repetições|séries/)
    })
  })
})

describe('Given content without a letter', () => {
  describe('When the email is rendered', () => {
    it('Then should leave the letter out', () => {
      const email = renderNoticeEmail({ ...CONTENT, letter: null }, LINKS)

      expect(email.text).not.toContain('Letra B\n')
      expect(email.html).not.toContain('<strong>Letra')
    })
  })
})

describe('Given content with HTML characters', () => {
  describe('When the email is rendered', () => {
    const email = renderNoticeEmail(
      { ...CONTENT, groups: ['<script>alert("x")</script> & cia'] },
      { appOrigin: APP_ORIGIN, unsubscribeToken: 'a&b' },
    )

    it('Then should escape the content in the HTML', () => {
      expect(email.html).not.toContain('<script>')
      expect(email.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; cia')
    })

    it('Then should encode the token in the links', () => {
      expect(email.headers['List-Unsubscribe']).toBe(
        `<${APP_ORIGIN}/api/email/unsubscribe?token=a%26b>`,
      )
      expect(email.html).toContain('/desligar-emails#token=a%26b')
    })
  })
})

const QUADRICEPS_DROP: Notice = {
  key: 'level_drop:quadriceps:2026-11-27T17:00:00.000Z',
  kind: 'level_drop',
  letter: 'C',
  groups: [{ slug: 'quadriceps', name: 'quadríceps' }],
  eventAtMs: Date.parse('2026-11-27T17:00:00.000Z'),
  dueAtMs: Date.parse('2026-11-26T17:00:00.000Z'),
  level: { now: 7, after: 6 },
}

describe('Given quadriceps drops from level 7 to 6 tomorrow at 14h, trained by letter C (US-F17-02)', () => {
  describe('When the email content is made the day before', () => {
    it('Then should reuse the text of the push notice and keep the level now and after', () => {
      expect(noticeEmailContentOf(QUADRICEPS_DROP, QUADRICEPS_DROP.dueAtMs, SAO_PAULO)).toEqual({
        title: 'Quadríceps cai para o nível 6 amanhã às 14h',
        body: 'Nível 7 agora. A letra C recupera em dobro.',
        letter: 'C',
        groups: ['Quadríceps'],
        levels: { now: 7, after: 6 },
      })
    })
  })

  describe('When the email is rendered', () => {
    const email = renderNoticeEmail(
      noticeEmailContentOf(QUADRICEPS_DROP, QUADRICEPS_DROP.dueAtMs, SAO_PAULO),
      LINKS,
    )

    it('Then should show the level now and the level after the drop, with the letter, in the text', () => {
      expect(email.text).toContain(
        'Nível 7 → 6\nLetra C\nNível 7 agora. A letra C recupera em dobro.',
      )
    })

    it('Then should show the level now and the level after the drop in the HTML', () => {
      expect(email.html).toContain('>Nível 7 → 6</p>')
    })

    it('Then should keep the link and the headers to turn the emails off', () => {
      expect([
        email.html.includes('Desligar e-mails'),
        email.headers['List-Unsubscribe-Post'],
      ]).toEqual([true, 'List-Unsubscribe=One-Click'])
    })
  })
})

describe('Given the window notice of letter B (US-F17-02)', () => {
  describe('When the email is rendered', () => {
    it('Then should show no level line', () => {
      const email = renderNoticeEmail(
        noticeEmailContentOf(OPENING_OF_B, NOTICE_AT_MS, SAO_PAULO),
        LINKS,
      )

      expect(`${email.text}${email.html}`).not.toContain('→')
    })
  })
})
