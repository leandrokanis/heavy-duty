import { DatabaseSync } from 'node:sqlite'
import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { API_DATABASE_PATH } from './api-server.js'
import { test } from './auth-fixtures.js'

const { Given, When, Then } = createBdd(test)

declare global {
  interface Window {
    permissionAnswer?: NotificationPermission
    fakePushKey?: string
  }
}

// A placeholder in base64url: the fake push manager below never checks the key.
const PLACEHOLDER_PUBLIC_KEY = 'BPlaceholderPublicKeyE2E'

// Chromium in the test has no push service and no home screen, so the page plays the installed
// app: display-mode standalone, the system permission and a push manager that hands this endpoint.
async function installFakePush(page: Page, endpoint: string) {
  await page.addInitScript((pushEndpoint) => {
    const fetchOfPage = window.fetch.bind(window)
    window.fetch = (input, init) =>
      window.fakePushKey && String(input) === '/api/notifications/push-key'
        ? Promise.resolve(Response.json({ configured: true, publicKey: window.fakePushKey }))
        : fetchOfPage(input, init)

    const matchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query) =>
      query.includes('display-mode: standalone')
        ? ({ ...matchMedia(query), matches: true, media: query } as MediaQueryList)
        : matchMedia(query)

    let permission: NotificationPermission = 'default'
    Object.defineProperty(Notification, 'permission', { get: () => permission })
    Notification.requestPermission = async () => {
      permission = window.permissionAnswer ?? 'default'
      return permission
    }

    let subscribed = false
    const subscription = {
      endpoint: pushEndpoint,
      toJSON: () => ({
        endpoint: pushEndpoint,
        keys: { p256dh: 'BBrowserKey', auth: 'BrowserAuth' },
      }),
      unsubscribe: async () => {
        subscribed = false
        return true
      },
    }
    PushManager.prototype.getSubscription = async () =>
      (subscribed ? subscription : null) as PushSubscription | null
    PushManager.prototype.subscribe = async () => {
      subscribed = true
      return subscription as unknown as PushSubscription
    }
  }, endpoint)
}

function storedEndpoints(): string[] {
  const db = new DatabaseSync(API_DATABASE_PATH)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    return db
      .prepare('SELECT endpoint FROM push_subscriptions')
      .all()
      .map((row) => String(row.endpoint))
  } finally {
    db.close()
  }
}

function noticesSwitch(page: Page) {
  return page
    .getByRole('dialog', { name: 'Avisos' })
    .getByRole('button', { name: 'Avisos no celular' })
}

Given('the app is open in the browser, outside the home screen', async ({ page }) => {
  await page.goto('/')
})

Given(
  'the app is installed on the home screen with the push endpoint {string}',
  async ({ page }, endpoint: string) => {
    await installFakePush(page, endpoint)
    await page.goto('/')
  },
)

// The API of the test runs without the VAPID keys, and the service worker hides its requests from
// page.route, so the page answers the key itself.
Given('the server holds the push keys', async ({ page }) => {
  await page.evaluate((publicKey) => {
    window.fakePushKey = publicKey
  }, PLACEHOLDER_PUBLIC_KEY)
})

When('the athlete opens the notices control', async ({ page }) => {
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state))
    .toBe('activated')
  await page.getByRole('button', { name: 'Avisos', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Avisos' })).toBeVisible()
})

When(
  'the athlete turns the notices on and the system permission answers {string}',
  async ({ page }, answer: NotificationPermission) => {
    await page.evaluate((value) => {
      window.permissionAnswer = value
    }, answer)
    const toggle = noticesSwitch(page)
    await expect(toggle).not.toHaveAttribute('aria-disabled', 'true')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-busy', 'true')
  },
)

When('the athlete turns the notices off', async ({ page }) => {
  const toggle = noticesSwitch(page)
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

Then(
  'the notices switch should be unavailable with the reason {string}',
  async ({ page }, reason: string) => {
    const toggle = noticesSwitch(page)
    await expect(toggle).toHaveAccessibleDescription(reason)
    await expect(toggle).toHaveAttribute('aria-disabled', 'true')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  },
)

Then('the notices switch should be on', async ({ page }) => {
  await expect(noticesSwitch(page)).toHaveAttribute('aria-pressed', 'true')
})

Then('the notices switch should be off', async ({ page }) => {
  await expect(noticesSwitch(page)).toHaveAttribute('aria-pressed', 'false')
})

Then(
  'the API should hold the push subscription {string}',
  // biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
  async ({}, endpoint: string) => {
    await expect.poll(storedEndpoints).toContain(endpoint)
  },
)

Then(
  'the API should not hold the push subscription {string}',
  // biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
  async ({}, endpoint: string) => {
    await expect.poll(storedEndpoints).not.toContain(endpoint)
  },
)

Then(
  'the header buttons {string} and {string} should be targets of 44 px on one line',
  async ({ page }, notices: string, history: string) => {
    const header = page.locator('header')
    const boxes = await Promise.all([
      header.getByRole('button', { name: notices, exact: true }).boundingBox(),
      header.getByRole('link', { name: history, exact: true }).boundingBox(),
    ])
    const [first, second] = boxes.map((box) => box ?? { x: 0, y: 0, width: 0, height: 0 })

    expect({
      sizes: boxes.map((box) => [box?.width, box?.height]),
      sameTop: first?.y === second?.y,
      gap: (second?.x ?? 0) - ((first?.x ?? 0) + (first?.width ?? 0)),
    }).toEqual({
      sizes: [
        [44, 44],
        [44, 44],
      ],
      sameTop: true,
      gap: 8,
    })
  },
)
