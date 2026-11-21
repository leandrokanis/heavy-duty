import { createHash, randomBytes } from 'node:crypto'
import type { APIRequestContext, APIResponse, Browser } from '@playwright/test'
import { test as base, signInWithCookie } from './auth-fixtures.js'
import { APP_BASE_URL } from './catalog-api.js'

// Playwright intercepts this address, so no port opens (decision 54 of the story).
export const MCP_E2E_REDIRECT_URI = 'http://127.0.0.1:3199/callback'

type AuthorizationServerMetadata = {
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint: string
}

async function readJson<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${response.url()} answered ${response.status()}: ${await response.text()}`)
  }
  return (await response.json()) as T
}

async function approveInTheBrowser(
  browser: Browser,
  sessionCookie: string,
  authorizationUrl: string,
): Promise<URL> {
  const context = await browser.newContext({ baseURL: APP_BASE_URL })
  try {
    await signInWithCookie(context, sessionCookie)
    const page = await context.newPage()
    let callback: URL | undefined
    await page.route(`${MCP_E2E_REDIRECT_URI}**`, async (route) => {
      callback = new URL(route.request().url())
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' })
    })
    await page.goto(authorizationUrl)
    await page.getByRole('button', { name: 'Permitir' }).click()
    await page.waitForURL(`${MCP_E2E_REDIRECT_URI}**`)
    if (!callback) throw new Error('the consent screen did not redirect to the callback')
    return callback
  } finally {
    await context.close()
  }
}

// Goes through the real flow through the e2e proxy: discovery, registration, consent and exchange.
export async function obtainMcpAccessToken(
  browser: Browser,
  request: APIRequestContext,
  sessionCookie: string,
): Promise<string> {
  const metadata = await readJson<AuthorizationServerMetadata>(
    await request.get(`${APP_BASE_URL}/.well-known/oauth-authorization-server`),
  )
  const { client_id: clientId } = await readJson<{ client_id: string }>(
    await request.post(metadata.registration_endpoint, {
      data: { client_name: 'heavy-duty-e2e', redirect_uris: [MCP_E2E_REDIRECT_URI] },
    }),
  )
  const codeVerifier = randomBytes(32).toString('base64url')
  const state = randomBytes(8).toString('hex')
  const authorizationUrl = new URL(metadata.authorization_endpoint)
  authorizationUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: MCP_E2E_REDIRECT_URI,
    code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
    code_challenge_method: 'S256',
    state,
    resource: `${APP_BASE_URL}/mcp`,
  }).toString()
  const callback = await approveInTheBrowser(browser, sessionCookie, authorizationUrl.toString())
  if (callback.searchParams.get('state') !== state) {
    throw new Error('the callback state does not match the request')
  }
  const tokens = await readJson<{ access_token: string }>(
    await request.post(metadata.token_endpoint, {
      form: {
        grant_type: 'authorization_code',
        code: callback.searchParams.get('code') ?? '',
        redirect_uri: MCP_E2E_REDIRECT_URI,
        client_id: clientId,
        code_verifier: codeVerifier,
        resource: `${APP_BASE_URL}/mcp`,
      },
    }),
  )
  return tokens.access_token
}

export type McpAuthState = { listed?: APIResponse; refused?: APIResponse }

// The request fixture sends both credentials: /api/* reads only the cookie and /mcp only the Bearer.
export const test = base.extend<{ mcpAuth: McpAuthState }, { mcpAccessToken: string }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  mcpAuth: async ({}, use) => {
    await use({})
  },
  mcpAccessToken: [
    async ({ browser, playwright, sessionCookie }, use) => {
      const request = await playwright.request.newContext()
      try {
        await use(await obtainMcpAccessToken(browser, request, sessionCookie))
      } finally {
        await request.dispose()
      }
    },
    { scope: 'worker' },
  ],
  request: async ({ playwright, sessionCookie, mcpAccessToken }, use) => {
    const request = await playwright.request.newContext({
      extraHTTPHeaders: { cookie: sessionCookie, authorization: `Bearer ${mcpAccessToken}` },
    })
    await use(request)
    await request.dispose()
  },
})
