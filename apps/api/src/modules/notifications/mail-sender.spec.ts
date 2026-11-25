import nodemailer from 'nodemailer'
import { describe, expect, it } from 'vitest'
import type { NoticeEmail } from './email-notice.js'
import { createNodemailerMailSender, MailDeliveryError } from './mail-sender.js'

const ADDRESSES = { mailFrom: 'avisos@example.com', mailTo: 'atleta@example.com' }

const EMAIL: NoticeEmail = {
  subject: 'Costas, bíceps e lombar abrem amanhã às 9h',
  text: 'texto do aviso',
  html: '<p>texto do aviso</p>',
  headers: {
    'List-Unsubscribe': '<https://heavy.example.com/api/email/unsubscribe?token=t>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
}

const SENT_INFO = { envelope: { from: false as const, to: [] }, messageId: '<m@example.com>' }

function capturingTransport(sent: string[]) {
  return nodemailer.createTransport({
    name: 'capturing',
    version: '1',
    send: (mail, callback) => {
      mail.message.build((error, raw) => {
        if (raw) sent.push(raw.toString('utf8'))
        callback(error, SENT_INFO)
      })
    },
  })
}

function failingTransport(error: Record<string, unknown>) {
  return nodemailer.createTransport({
    name: 'failing',
    version: '1',
    send: (_mail, callback) =>
      callback(Object.assign(new Error(String(error.message)), error), SENT_INFO),
  })
}

describe('Given a Nodemailer mail sender over a transport that keeps the message in memory', () => {
  describe('When a notice email is sent', () => {
    it('Then should send it from "Heavy Duty" to MAIL_TO with the unsubscribe headers', async () => {
      const sent: string[] = []
      const sender = createNodemailerMailSender(capturingTransport(sent), ADDRESSES)

      await sender.send(EMAIL)

      const raw = sent[0] ?? ''
      expect(raw).toContain('From: Heavy Duty <avisos@example.com>')
      expect(raw).toContain('To: atleta@example.com')
      expect(raw).toContain(
        'List-Unsubscribe: <https://heavy.example.com/api/email/unsubscribe?token=t>',
      )
      expect(raw).toContain('List-Unsubscribe-Post: List-Unsubscribe=One-Click')
      expect(raw).toContain('Content-Type: text/html')
    })
  })
})

describe('Given an SMTP server that refuses the connection', () => {
  describe('When a notice email is sent', () => {
    const sender = createNodemailerMailSender(
      failingTransport({
        code: 'ECONNECTION',
        message: 'connect ECONNREFUSED 10.0.0.25:25 for atleta@example.com',
      }),
      ADDRESSES,
    )

    it('Then should fail with a MailDeliveryError that names the error code', async () => {
      await expect(sender.send(EMAIL)).rejects.toThrow(MailDeliveryError)
      await expect(sender.send(EMAIL)).rejects.toThrow('ECONNECTION')
    })

    it('Then should not carry the address nor the message of the server', async () => {
      const error = await sender.send(EMAIL).catch((caught: unknown) => caught)

      expect(String((error as Error).message)).not.toMatch(/example\.com|10\.0\.0\.25/)
    })
  })
})

describe('Given an SMTP server that rejects the message with a response code', () => {
  describe('When a notice email is sent', () => {
    it('Then should name the error code and the SMTP response code', async () => {
      const sender = createNodemailerMailSender(
        failingTransport({ code: 'EENVELOPE', responseCode: 550, message: '550 rejected' }),
        ADDRESSES,
      )

      await expect(sender.send(EMAIL)).rejects.toThrow('EENVELOPE (SMTP 550)')
    })
  })
})

describe('Given a transport that fails without an error code', () => {
  describe('When a notice email is sent', () => {
    it('Then should report an unknown failure', async () => {
      const sender = createNodemailerMailSender(failingTransport({ message: 'boom' }), ADDRESSES)

      await expect(sender.send(EMAIL)).rejects.toThrow('email delivery failed: unknown error')
    })
  })
})
