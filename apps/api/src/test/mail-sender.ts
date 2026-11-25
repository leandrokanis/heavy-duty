import type { NoticeEmail } from '../modules/notifications/email-notice.js'
import { MailDeliveryError, type MailSender } from '../modules/notifications/mail-sender.js'

export type FakeMailSender = MailSender & { sent: NoticeEmail[] }

// Records every email; with a failure reason, refuses each one as the SMTP server would.
export function createFakeMailSender(failureReason?: string): FakeMailSender {
  const sent: NoticeEmail[] = []
  return {
    sent,
    async send(email) {
      if (failureReason !== undefined) throw new MailDeliveryError(failureReason)
      sent.push(email)
    },
  }
}
