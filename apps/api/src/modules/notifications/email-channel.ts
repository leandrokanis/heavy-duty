import { noticeEmailContentOf, renderNoticeEmail } from './email-notice.js'
import { MailDeliveryError, type MailSender } from './mail-sender.js'
import type { NoticeChannel } from './notice-scheduler.js'

export type EmailChannelOptions = { appOrigin: string; timeZone: string }

// Stands in for the token of each email until the link to turn the emails off works (ADR-037).
export const PLACEHOLDER_UNSUBSCRIBE_TOKEN = 'pending'

export function createEmailChannel(
  sender: MailSender,
  options: EmailChannelOptions,
): NoticeChannel {
  return {
    name: 'email',
    async deliver(notice, nowMs) {
      const email = renderNoticeEmail(noticeEmailContentOf(notice, nowMs, options.timeZone), {
        appOrigin: options.appOrigin,
        unsubscribeToken: PLACEHOLDER_UNSUBSCRIBE_TOKEN,
      })
      try {
        await sender.send(email)
        return { status: 'sent', error: null }
      } catch (error) {
        if (error instanceof MailDeliveryError) return { status: 'failed', error: error.reason }
        throw error
      }
    },
  }
}
