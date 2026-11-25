import nodemailer, { type Transporter } from 'nodemailer'
import { type MailConfig, smtpTransportOptionsOf } from '../../config/mail-env.js'
import type { NoticeEmail } from './email-notice.js'

export type MailSender = {
  send(email: NoticeEmail): Promise<void>
}

export type MailAddresses = Pick<MailConfig, 'mailFrom' | 'mailTo'>

const SENDER_NAME = 'Heavy Duty'

// reason is safe to store and show: it never carries an address, a password or the server text.
export class MailDeliveryError extends Error {
  constructor(readonly reason: string) {
    super(`email delivery failed: ${reason}`)
    this.name = 'MailDeliveryError'
  }
}

export function createSmtpMailSender(config: MailConfig): MailSender {
  return createNodemailerMailSender(
    nodemailer.createTransport(smtpTransportOptionsOf(config)),
    config,
  )
}

export function createNodemailerMailSender(
  transport: Transporter,
  addresses: MailAddresses,
): MailSender {
  return {
    async send(email) {
      try {
        await transport.sendMail({
          from: { name: SENDER_NAME, address: addresses.mailFrom },
          to: addresses.mailTo,
          subject: email.subject,
          text: email.text,
          html: email.html,
          headers: email.headers,
        })
      } catch (error) {
        throw new MailDeliveryError(safeReasonOf(error))
      }
    },
  }
}

function safeReasonOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'unknown error'
  const code = 'code' in error && typeof error.code === 'string' ? error.code : null
  const responseCode =
    'responseCode' in error && typeof error.responseCode === 'number' ? error.responseCode : null
  if (code === null && responseCode === null) return 'unknown error'
  const smtp = responseCode === null ? '' : ` (SMTP ${responseCode})`
  return `${code ?? 'ESMTP'}${smtp}`
}
