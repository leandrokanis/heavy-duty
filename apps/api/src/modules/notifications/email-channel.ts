import type { Database } from '../../db/connection.js'
import { renderWeeklyDigestEmail } from './email-digest.js'
import { type NoticeEmail, noticeEmailContentOf, renderNoticeEmail } from './email-notice.js'
import { createUnsubscribeToken, unsubscribeTokenHashOf } from './email-opt-out.service.js'
import { isEmailEnabled } from './email-settings.service.js'
import { MailDeliveryError, type MailSender } from './mail-sender.js'
import type { ChannelResult, NoticeChannel } from './notice-scheduler.js'

export type EmailChannelOptions = { appOrigin: string; timeZone: string }

export const EMAILS_TURNED_OFF = 'emails turned off'

export function createEmailChannel(
  db: Database,
  sender: MailSender,
  options: EmailChannelOptions,
): NoticeChannel {
  // A token per email: the database keeps only its hash, in the row of the notice (ADR-037).
  const send = async (render: (token: string) => NoticeEmail): Promise<ChannelResult> => {
    if (!isEmailEnabled(db)) return { status: 'skipped', error: EMAILS_TURNED_OFF }
    const token = createUnsubscribeToken()
    try {
      await sender.send(render(token))
      return { status: 'sent', error: null, unsubscribeTokenHash: unsubscribeTokenHashOf(token) }
    } catch (error) {
      if (error instanceof MailDeliveryError) return { status: 'failed', error: error.reason }
      throw error
    }
  }
  return {
    name: 'email',
    deliver: (notice, nowMs) =>
      send((token) =>
        renderNoticeEmail(noticeEmailContentOf(notice, nowMs, options.timeZone), {
          appOrigin: options.appOrigin,
          unsubscribeToken: token,
        }),
      ),
    // The weekly digest goes only by email (ADR-041).
    deliverDigest: (digest) =>
      send((token) =>
        renderWeeklyDigestEmail(
          digest,
          { appOrigin: options.appOrigin, unsubscribeToken: token },
          options.timeZone,
        ),
      ),
  }
}
