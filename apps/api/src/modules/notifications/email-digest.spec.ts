import { describe, expect, it } from 'vitest'
import { renderWeeklyDigestEmail } from './email-digest.js'
import type { WeeklyDigest } from './weekly-digest.rules.js'

const APP_ORIGIN = 'https://heavy.example.com'
const LINKS = { appOrigin: APP_ORIGIN, unsubscribeToken: 'token-123' }
const SAO_PAULO = 'America/Sao_Paulo'

const DIGEST: WeeklyDigest = {
  weekStartsAtMs: Date.parse('2026-11-30T03:00:00.000Z'),
  weekEndsAtMs: Date.parse('2026-12-07T03:00:00.000Z'),
  weeklyGoal: 5,
  windowsUsed: 3,
  windowsMissed: 1,
  weekPoints: 1250,
  weekStreak: 4,
  levels: [
    { slug: 'chest', name: 'peito', from: 12, to: 13 },
    { slug: 'biceps', name: 'bíceps', from: 10, to: 11 },
  ],
  records: ['Supino reto', 'Remada baixa'],
  medals: ['Primeiro recorde'],
}

describe('Given the digest of a week with 3 of 5 windows used', () => {
  describe('When the email is rendered', () => {
    const email = renderWeeklyDigestEmail(DIGEST, LINKS, SAO_PAULO)

    it('Then the subject should say the windows used of the goal', () => {
      expect(email.subject).toBe('Sua semana: 3 de 5 janelas')
    })

    it('Then the text should show the week, the windows, the points and the streak', () => {
      expect(email.text).toContain('Semana de 30/11 a 6/12')
      expect(email.text).toContain('3 de 5 janelas · 1.250 pontos · 4 semanas seguidas')
      expect(email.text).toContain('1 janela perdida')
    })

    it('Then the text should list the levels, the records by name and the medals', () => {
      expect(email.text).toContain('Peito 12 → 13\nBíceps 10 → 11')
      expect(email.text).toContain('2 recordes: Supino reto e Remada baixa')
      expect(email.text).toContain('Medalha nova: Primeiro recorde')
    })

    it('Then the HTML should show the same content', () => {
      for (const part of [
        '>Sua semana</h1>',
        '3 de 5 janelas',
        '1.250 pontos',
        'Peito 12 → 13',
        'Supino reto e Remada baixa',
        'Primeiro recorde',
      ]) {
        expect(email.html).toContain(part)
      }
    })

    it('Then it should link the app and end with the link to turn the emails off', () => {
      expect(email.text).toContain(`Abrir o app: ${APP_ORIGIN}/`)
      expect(email.text).toContain(
        `Desligar e-mails: ${APP_ORIGIN}/desligar-emails#token=token-123`,
      )
      expect(email.headers['List-Unsubscribe']).toBe(
        `<${APP_ORIGIN}/api/email/unsubscribe?token=token-123>`,
      )
    })
  })
})

describe('Given the digest of a quiet week with no goal', () => {
  describe('When the email is rendered', () => {
    const email = renderWeeklyDigestEmail(
      {
        ...DIGEST,
        weeklyGoal: null,
        windowsUsed: 1,
        windowsMissed: 0,
        weekPoints: 0,
        weekStreak: 1,
        levels: [],
        records: [],
        medals: [],
      },
      LINKS,
      SAO_PAULO,
    )

    it('Then the subject should say the windows used alone', () => {
      expect(email.subject).toBe('Sua semana: 1 janela aproveitada')
    })

    it('Then the text should leave out the levels, the records and the medals', () => {
      expect(email.text).toContain('1 janela · 0 pontos · 1 semana seguida')
      expect(email.text).not.toMatch(/→|recorde|Medalha|perdida/)
    })
  })
})
