import {
  auth,
  extractResourceMetadataUrl,
  type OAuthClientProvider,
} from '@modelcontextprotocol/sdk/client/auth.js'
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { DEFAULT_MCP_ALLOWED_HOSTS } from '../../mcp/host-guard.js'
import { createTestDatabase } from '../../test/database.js'
import { createSessionCookie } from '../../test/session.js'
import { createProgram } from '../programs/program.service.js'

const APP_ORIGIN = 'https://hd.example'
const SERVER_URL = 'https://hd.example/mcp'
const CALLBACK = 'https://claude.example/callback'

type App = ReturnType<typeof createApp>

// Plays the browser: opens the consent preview and taps "Permitir" with the PO's access session.
class ConsentingProvider implements OAuthClientProvider {
  clientInfo: OAuthClientInformationMixed | undefined
  savedTokens: OAuthTokens | undefined
  verifier = ''
  authorizationCode: string | undefined
  returnedState: string | null = null

  constructor(
    private readonly app: App,
    private readonly db: Database,
  ) {}

  get redirectUrl(): string {
    return CALLBACK
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'Claude (SDK)',
      redirect_uris: [CALLBACK],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }
  }

  state(): string {
    return 'sdk-state'
  }

  clientInformation() {
    return this.clientInfo
  }

  saveClientInformation(info: OAuthClientInformationMixed): void {
    this.clientInfo = info
  }

  tokens() {
    return this.savedTokens
  }

  saveTokens(tokens: OAuthTokens): void {
    this.savedTokens = tokens
  }

  saveCodeVerifier(verifier: string): void {
    this.verifier = verifier
  }

  codeVerifier(): string {
    return this.verifier
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    const cookie = createSessionCookie(this.db)
    const params = Object.fromEntries(authorizationUrl.searchParams)
    const preview = await this.app.request(`/api/oauth/authorization${authorizationUrl.search}`, {
      headers: { cookie },
    })
    if (((await preview.json()) as { kind: string }).kind !== 'consent') return
    const decision = await this.app.request('/api/oauth/authorization', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ ...params, decision: 'approve' }),
    })
    const redirectTo = new URL(((await decision.json()) as { redirectTo: string }).redirectTo)
    this.authorizationCode = redirectTo.searchParams.get('code') ?? undefined
    this.returnedState = redirectTo.searchParams.get('state')
  }
}

function givenAppWithAProgram() {
  const db = createTestDatabase()
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db,
    appOrigin: APP_ORIGIN,
    mcpAllowedHosts: [...DEFAULT_MCP_ALLOWED_HOSTS, 'hd.example'],
  })
  createProgram(db, { name: 'Programa 1', goal: 'hypertrophy' }, new Date())
  const fetchFn = (url: string | URL, init?: RequestInit) =>
    Promise.resolve(app.request(url.toString(), init))
  return { db, app, fetchFn }
}

function postMcp(fetchFn: ReturnType<typeof givenAppWithAProgram>['fetchFn'], token?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  }
  if (token) headers.authorization = `Bearer ${token}`
  return fetchFn(SERVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'list_programs', arguments: {} },
    }),
  })
}

async function listedProgramNames(
  fetchFn: ReturnType<typeof givenAppWithAProgram>['fetchFn'],
  token: string,
) {
  const response = await postMcp(fetchFn, token)
  const body = (await response.json()) as {
    result?: { structuredContent?: { programs?: { name: string }[] } }
  }
  return body.result?.structuredContent?.programs?.map((program) => program.name)
}

async function authorizeWithSdk(given: ReturnType<typeof givenAppWithAProgram>) {
  const provider = new ConsentingProvider(given.app, given.db)
  const unauthorized = await postMcp(given.fetchFn)
  const resourceMetadataUrl = extractResourceMetadataUrl(unauthorized)
  const first = await auth(provider, {
    serverUrl: SERVER_URL,
    resourceMetadataUrl,
    fetchFn: given.fetchFn,
  })
  const second = await auth(provider, {
    serverUrl: SERVER_URL,
    resourceMetadataUrl,
    authorizationCode: provider.authorizationCode,
    fetchFn: given.fetchFn,
  })
  return { provider, unauthorized, resourceMetadataUrl, first, second }
}

describe('Given an app with APP_ORIGIN https://hd.example and a program', () => {
  describe('When the SDK client starts from the 401 of /mcp, discovers, registers, gets the approval and exchanges the code', () => {
    it('Then the provider should hold a credential that calls list_programs', async () => {
      const given = givenAppWithAProgram()

      const { provider, unauthorized, resourceMetadataUrl, first, second } =
        await authorizeWithSdk(given)
      const names = await listedProgramNames(
        given.fetchFn,
        provider.savedTokens?.access_token ?? '',
      )

      expect({
        unauthorizedStatus: unauthorized.status,
        resourceMetadataUrl: resourceMetadataUrl?.href,
        first,
        returnedState: provider.returnedState,
        second,
        tokenType: provider.savedTokens?.token_type,
        hasRefreshToken: Boolean(provider.savedTokens?.refresh_token),
        names,
      }).toEqual({
        unauthorizedStatus: 401,
        resourceMetadataUrl: 'https://hd.example/.well-known/oauth-protected-resource/mcp',
        first: 'REDIRECT',
        returnedState: 'sdk-state',
        second: 'AUTHORIZED',
        tokenType: 'Bearer',
        hasRefreshToken: true,
        names: ['Programa 1'],
      })
    })
  })

  describe('When the SDK client renews the credential', () => {
    it('Then the new credential should also call list_programs', async () => {
      const given = givenAppWithAProgram()
      const { provider, resourceMetadataUrl } = await authorizeWithSdk(given)
      const firstAccessToken = provider.savedTokens?.access_token

      const renewed = await auth(provider, {
        serverUrl: SERVER_URL,
        resourceMetadataUrl,
        fetchFn: given.fetchFn,
      })
      const names = await listedProgramNames(
        given.fetchFn,
        provider.savedTokens?.access_token ?? '',
      )

      expect({
        renewed,
        rotated: provider.savedTokens?.access_token !== firstAccessToken,
        names,
      }).toEqual({ renewed: 'AUTHORIZED', rotated: true, names: ['Programa 1'] })
    })
  })
})
