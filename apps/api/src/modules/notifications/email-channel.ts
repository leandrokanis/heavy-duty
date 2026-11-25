import type { Database } from '../../db/connection.js'
import { noticeEmailContentOf, renderNoticeEmail } from './email-notice.js'
import { createUnsubscribeToken, unsubscribeTokenHashOf } from './email-opt-out.service.js'
import { isEmailEnabled } from './email-settings.service.js'
import { MailDeliveryError, type MailSender } from './mail-sender.js'
import type { NoticeChannel } from './notice-scheduler.js'

export type EmailChannelOptions = { appOrigin: string; timeZone: string }

export const EMAILS_TURNED_OFF = 'emails turned off'

export function createEmailChannel(
  db: Database,
  sender: MailSender,
  options: EmailChannelOptions,
): NoticeChannel {
  return {
    name: 'email',
    async deliver(notice, nowMs) {
      if (!isEmailEnabled(db)) return { status: 'skipped', error: EMAILS_TURNED_OFF }
      // A token per email: the database keeps only its hash, in the row of the notice (ADR-037).
      const token = createUnsubscribeToken()
      const email = renderNoticeEmail(noticeEmailContentOf(notice, nowMs, options.timeZone), {
        appOrigin: options.appOrigin,
        unsubscribeToken: token,
      })
      try {
        await sender.send(email)
        return { status: 'sent', error: null, unsubscribeTokenHash: unsubscribeTokenHashOf(token) }
      } catch (error) {
        if (error instanceof MailDeliveryError) return { status: 'failed', error: error.reason }
        throw error
      }
    },
  }
}
