import { type Browser, expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  addVirtualAuthenticator,
  createEnrollmentLink,
  enroll,
  readPasskeys,
  readSessionCookie,
  test,
  type VirtualAuthenticator,
  type VirtualCredential,
} from './auth-fixtures.js'
import { APP_BASE_URL } from './catalog-api.js'

const { Given, When, Then } = createBdd(test)

const TOUCH_TARGET_MIN_PX = 44

type ManifestIcon = { src: string; sizes: string; type: string; purpose: string }

// Enrolls in a throwaway browser and returns the passkey, so another browser can hold it.
async function enrollElsewhere(browser: Browser, link = createEnrollmentLink()) {
  const context = await browser.newContext({ baseURL: APP_BASE_URL })
  const page = await context.newPage()
  const authenticator = await addVirtualAuthenticator(page)
  await enroll(page, link)
  const credentials = await readPasskeys(authenticator)
  await context.close()
  return credentials
}

async function copyPasskeys(authenticator: VirtualAuthenticator, credentials: VirtualCredential[]) {
  for (const credential of credentials) {
    await authenticator.cdp.send('WebAuthn.addCredential', {
      authenticatorId: authenticator.authenticatorId,
      credential,
    })
  }
}

async function expectTouchTarget(page: Page, name: string) {
  const box = await page.getByRole('button', { name }).boundingBox()
  expect({
    width: (box?.width ?? 0) >= TOUCH_TARGET_MIN_PX,
    height: (box?.height ?? 0) >= TOUCH_TARGET_MIN_PX,
  }).toEqual({ width: true, height: true })
}

Given('the athlete enrolled a passkey with an enrollment link', async ({ page, auth }) => {
  auth.authenticator = await addVirtualAuthenticator(page)
  auth.enrollmentLink = createEnrollmentLink()
  await enroll(page, auth.enrollmentLink)
})

Given('the PO generated an enrollment link on the server', async ({ page, auth }) => {
  auth.authenticator = await addVirtualAuthenticator(page)
  auth.enrollmentLink = createEnrollmentLink()
})

Given('a browser without an access session', async ({ context }) => {
  expect(await readSessionCookie(context)).toBeUndefined()
})

Given('the athlete enrolled a passkey in another browser', async ({ browser, auth }) => {
  auth.enrollmentLink = createEnrollmentLink()
  auth.credentials = await enrollElsewhere(browser, auth.enrollmentLink)
})

Given('the athlete opens the app in this browser with the same passkey', async ({ page, auth }) => {
  auth.authenticator = await addVirtualAuthenticator(page)
  await copyPasskeys(auth.authenticator, auth.credentials ?? [])
  await page.goto('/')
})

Given(
  'a new browser whose phone has a passkey that fails user verification',
  async ({ browser, page, auth }) => {
    const credentials = await enrollElsewhere(browser)
    auth.authenticator = await addVirtualAuthenticator(page)
    await copyPasskeys(auth.authenticator, credentials)
    await auth.authenticator.cdp.send('WebAuthn.setUserVerified', {
      authenticatorId: auth.authenticator.authenticatorId,
      isUserVerified: false,
    })
    await page.goto('/')
  },
)

When('the browser reads the web app manifest', async ({ page, auth }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const response = await page.request.get(href ?? '')
  auth.manifest = (await response.json()) as Record<string, unknown>
})

When('it opens {string} and {string}', async ({ page }, first: string, second: string) => {
  for (const path of [first, second]) {
    await page.goto(path)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    await expectTouchTarget(page, 'Entrar')
  }
})

When('the athlete taps {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click()
})

When(
  'the athlete opens the link, taps {string} and confirms on the phone',
  async ({ page, auth }, name: string) => {
    await page.goto(auth.enrollmentLink ?? '')
    await expectTouchTarget(page, name)
    await page.getByRole('button', { name }).click()
    await expect(page).toHaveURL(`${APP_BASE_URL}/`)
  },
)

When(
  'someone opens the same link in this browser and taps {string}',
  async ({ page, auth }, name: string) => {
    auth.authenticator = await addVirtualAuthenticator(page)
    await page.goto(auth.enrollmentLink ?? '')
    await page.getByRole('button', { name }).click()
  },
)

When('the app ends the access session', async ({ page }) => {
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session', { method: 'DELETE' })
    return response.status
  })
  expect(status).toBe(204)
})

When('the athlete opens the app again', async ({ page }) => {
  await page.reload()
})

Then(
  'the manifest should declare the standalone display, the start URL {string} and the three PNG icons',
  async ({ page, auth }, startUrl: string) => {
    const icons = (auth.manifest?.icons ?? []) as ManifestIcon[]
    const iconStatuses = await Promise.all(
      icons.map(async (icon) => (await page.request.get(icon.src)).status()),
    )

    expect({
      display: auth.manifest?.display,
      startUrl: auth.manifest?.start_url,
      icons: icons.map(({ sizes, type, purpose }) => `${sizes} ${type} ${purpose}`),
      iconStatuses,
    }).toEqual({
      display: 'standalone',
      startUrl,
      icons: ['192x192 image/png any', '512x512 image/png any', '512x512 image/png maskable'],
      iconStatuses: [200, 200, 200],
    })
  },
)

Then('the service worker should control the page', async ({ page }) => {
  await page.evaluate(() => navigator.serviceWorker.ready)
  // The first load is not controlled; a reload after activation is.
  await expect
    .poll(async () => {
      const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
      if (!controlled) await page.reload()
      return controlled
    })
    .toBe(true)
})

Then('the home page should show without the {string} button', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { name: 'Heavy Duty' })).toBeVisible()
  await expect(page.getByRole('button', { name })).toHaveCount(0)
})

Then(
  'the cache should hold no API response after an API request under the service worker',
  async ({ page }) => {
    const cachedApiUrls = await page.evaluate(async () => {
      if (navigator.serviceWorker.controller === null) throw new Error('page not controlled')
      await fetch('/api/auth/session')
      await fetch('/api/muscle-groups')
      const urls: string[] = []
      for (const name of await caches.keys()) {
        const cache = await caches.open(name)
        for (const request of await cache.keys()) urls.push(request.url)
      }
      return urls.filter((url) => new URL(url).pathname.startsWith('/api/'))
    })

    expect(cachedApiUrls).toEqual([])
  },
)

Then(
  'each page should show the {string} button with a touch area of at least 44 px',
  async ({ page }, name: string) => {
    await expect(page.getByRole('button', { name })).toBeVisible()
    await expectTouchTarget(page, name)
    await expect(page.getByRole('heading', { name: 'Sem conexão' })).toHaveCount(0)
  },
)

Then(
  'a data route of the API should answer 401 with code {string}',
  async ({ page }, code: string) => {
    const response = await page.request.get('/api/muscle-groups')

    expect({ status: response.status(), body: await response.json() }).toEqual({
      status: 401,
      body: { code, message: 'Entre com a sua chave de acesso.' },
    })
  },
)

Then(
  'the manifest, the icons, the service worker and the offline page should answer without a session',
  async ({ page }) => {
    const paths = [
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/icon-maskable-512.png',
      '/icons/apple-touch-icon.png',
      '/sw.js',
      '/~offline',
    ]
    const statuses = await Promise.all(
      paths.map(async (path) => (await page.request.get(path)).status()),
    )

    expect(statuses).toEqual(paths.map(() => 200))
  },
)

Then('the browser should hold an HttpOnly hd_session cookie', async ({ context }) => {
  const cookie = await readSessionCookie(context)

  expect({ present: cookie !== undefined, httpOnly: cookie?.httpOnly }).toEqual({
    present: true,
    httpOnly: true,
  })
})

Then('the browser should hold no hd_session cookie', async ({ context }) => {
  expect(await readSessionCookie(context)).toBeUndefined()
})

Then('the enrollment link should no longer work', async ({ page, auth }) => {
  await page.goto(auth.enrollmentLink ?? '')
  await page.getByRole('button', { name: 'Criar chave de acesso' }).click()

  await expect(
    page.getByText('Link de cadastro inválido ou vencido. Gere outro link no servidor.'),
  ).toBeVisible()
})

Then('the page should show the message {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message)).toBeVisible()
})

Then('the page should show the {string} button', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toBeVisible()
})
