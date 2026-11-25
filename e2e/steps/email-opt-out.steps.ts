import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { API_DATABASE_PATH } from './api-server.js'
import { APP_BASE_URL } from './catalog-api.js'
import { test } from './email-opt-out-fixtures.js'

const { Given, When, Then } = createBdd(test)

const UNSUBSCRIBE_URL = `${APP_BASE_URL}/api/email/unsubscribe`

function withDatabase<T>(action: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(API_DATABASE_PATH)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    return action(db)
  } finally {
    db.close()
  }
}

function isEmailEnabled(): boolean {
  return withDatabase((db) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'email_enabled'").get()
    return row?.value !== 'false'
  })
}

// The row the scheduler leaves after an email: the database keeps only the hash of the token.
function seedSentEmail(token: string): void {
  const now = new Date().toISOString()
  withDatabase((db) => {
    db.prepare("DELETE FROM settings WHERE key = 'email_enabled'").run()
    db.prepare(
      `INSERT INTO notifications (id, notice_key, kind, channel, letter, muscle_group_slugs,
        due_at, event_at, created_at, status, error, finished_at, unsubscribe_token_hash)
       VALUES (?, ?, 'window_close', 'email', 'B', '["back"]', ?, ?, ?, 'sent', NULL, ?, ?)`,
    ).run(
      randomUUID(),
      `e2e:${token}`,
      now,
      now,
      now,
      now,
      createHash('sha256').update(token).digest('hex'),
    )
  })
}

// A plain fetch carries no cookie and no Origin, as the email client does (RFC 8058).
function postOneClick(token: string): Promise<Response> {
  return fetch(`${UNSUBSCRIBE_URL}?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'List-Unsubscribe=One-Click',
  })
}

Given('an email notice was sent with its link to turn the emails off', async ({ emailOptOut }) => {
  emailOptOut.token = randomBytes(32).toString('base64url')
  seedSentEmail(emailOptOut.token)
})

When(
  'the athlete opens the link of that email, without signing in',
  async ({ page, emailOptOut }) => {
    await page.goto(`/desligar-emails#token=${emailOptOut.token}`)
  },
)

Then(
  'the page should offer {string} and say {string}',
  async ({ page }, button: string, text: string) => {
    await expect(page.getByRole('button', { name: button })).toBeVisible()
    await expect(page.getByText(text)).toBeVisible()
  },
)

Then('the page should say {string}', async ({ page }, heading: string) => {
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
})

When('the email client posts the one-click unsubscribe of that email', async ({ emailOptOut }) => {
  emailOptOut.response = await postOneClick(emailOptOut.token)
})

When(
  'the email client posts the one-click unsubscribe with an unknown token',
  async ({ emailOptOut }) => {
    emailOptOut.response = await postOneClick(randomBytes(32).toString('base64url'))
  },
)

Then('the answer should be the same as with a valid token', async ({ emailOptOut }) => {
  expect([emailOptOut.response?.status, await emailOptOut.response?.text()]).toEqual([204, ''])
})

Then('the emails should be off', async () => {
  await expect.poll(isEmailEnabled).toBe(false)
})

Then('the emails should still be on', async () => {
  expect(isEmailEnabled()).toBe(true)
})
