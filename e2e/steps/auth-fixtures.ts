import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type CDPSession, expect, type Page } from '@playwright/test'
import { test as base } from 'playwright-bdd'
import { API_DATABASE_PATH } from './api-server.js'
import { APP_BASE_URL } from './catalog-api.js'

const REPOSITORY_ROOT = fileURLToPath(new URL('../..', import.meta.url))

export const SESSION_COOKIE_NAME = 'hd_session'

export type VirtualAuthenticator = { cdp: CDPSession; authenticatorId: string }

export async function readPasskeys(authenticator: VirtualAuthenticator) {
  const { credentials } = await authenticator.cdp.send('WebAuthn.getCredentials', {
    authenticatorId: authenticator.authenticatorId,
  })
  return credentials
}

export type VirtualCredential = Awaited<ReturnType<typeof readPasskeys>>[number]

// The Chromium virtual authenticator plays the phone with a passkey (decision 14 of the story).
export async function addVirtualAuthenticator(
  page: Page,
  options: { isUserVerified?: boolean } = {},
): Promise<VirtualAuthenticator> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: options.isUserVerified ?? true,
      automaticPresenceSimulation: true,
    },
  })
  return { cdp, authenticatorId }
}

// Runs the real server command, so the e2e has no backdoor that creates sessions.
export function createEnrollmentLink(): string {
  const run = spawnSync('pnpm', ['--silent', '--filter', '@heavy-duty/api', 'auth:enroll'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_PATH: API_DATABASE_PATH,
      APP_ORIGIN: APP_BASE_URL,
    },
  })
  const link = /(http:\/\/\S+\/cadastro#token=[A-Za-z0-9_-]+)/.exec(run.stdout)?.[1]
  if (run.status !== 0 || !link) {
    throw new Error(`auth:enroll failed with status ${run.status}: ${run.stderr}`)
  }
  return link
}

export async function readSessionCookie(context: BrowserContext) {
  const cookies = await context.cookies(APP_BASE_URL)
  return cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME)
}

export async function enroll(page: Page, link = createEnrollmentLink()): Promise<string> {
  await page.goto(link)
  await page.getByRole('button', { name: 'Criar chave de acesso' }).click()
  await expect.poll(async () => (await readSessionCookie(page.context()))?.value).toBeTruthy()
  await expect(page).toHaveURL(`${APP_BASE_URL}/`)
  const cookie = await readSessionCookie(page.context())
  return cookie?.value ?? ''
}

export async function signInWithCookie(context: BrowserContext, sessionCookie: string) {
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: sessionCookie.slice(`${SESSION_COOKIE_NAME}=`.length),
      url: APP_BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

export type AuthState = {
  authenticator?: VirtualAuthenticator
  credentials?: VirtualCredential[]
  enrollmentLink?: string
  manifest?: Record<string, unknown>
}

export const test = base.extend<{ auth: AuthState }, { sessionCookie: string }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  auth: async ({}, use) => {
    await use({})
  },
  // Each worker enrolls one passkey through the real flow; FR-005 allows several passkeys.
  sessionCookie: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ baseURL: APP_BASE_URL })
      const page = await context.newPage()
      await addVirtualAuthenticator(page)
      const value = await enroll(page)
      await context.close()
      await use(`${SESSION_COOKIE_NAME}=${value}`)
    },
    { scope: 'worker' },
  ],
  request: async ({ playwright, sessionCookie }, use) => {
    const request = await playwright.request.newContext({
      extraHTTPHeaders: { cookie: sessionCookie },
    })
    await use(request)
    await request.dispose()
  },
})
