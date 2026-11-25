import { eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { settings } from '../../db/schema.js'
import type { EmailNotices, EmailNoticesInput } from './email-settings.schemas.js'

const EMAIL_ENABLED_KEY = 'email_enabled'

// The emails start on: the athlete turns them off from the link in an email (US-F17-04).
export function isEmailEnabled(db: Database): boolean {
  const row = db.select().from(settings).where(eq(settings.key, EMAIL_ENABLED_KEY)).get()
  return row?.value !== 'false'
}

export function setEmailNotices(db: Database, input: EmailNoticesInput, now: Date): EmailNotices {
  const value = String(input.enabled)
  const updatedAt = now.toISOString()
  db.insert(settings)
    .values({ key: EMAIL_ENABLED_KEY, value, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
    .run()
  return { emailEnabled: input.enabled, updatedAt }
}
