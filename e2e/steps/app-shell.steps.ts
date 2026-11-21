import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { signInWithCookie, test } from './auth-fixtures.js'

const { Given, When, Then } = createBdd(test)

Given('the athlete signed in with a passkey', async ({ context, sessionCookie }) => {
  await signInWithCookie(context, sessionCookie)
})

Given('the athlete opened the home page', async ({ page }) => {
  await page.goto('/')
})

When('the athlete opens the home page', async ({ page }) => {
  await page.goto('/')
})

When('the connection drops and the athlete opens another page', async ({ context, page }) => {
  await context.setOffline(true)
  await page.goto('/workout')
})

Then('the page should show the heading {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { name })).toBeVisible()
})

Then('the page should link to the web app manifest', async ({ page }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const response = await page.request.get(href ?? '')

  expect({ isOk: response.ok(), manifest: await response.json() }).toMatchObject({
    isOk: true,
    manifest: { name: 'Heavy Duty', display: 'standalone' },
  })
})

Then('the service worker should be active', async ({ page }) => {
  const readState = () =>
    page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.active?.state
    })

  await expect.poll(readState).toBe('activated')
})

Then('the page should not show the {string} button', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { name: 'Heavy Duty' })).toBeVisible()
  await expect(page.getByRole('button', { name })).toHaveCount(0)
})
