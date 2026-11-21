import { createHash } from 'node:crypto'
import type { createApp } from '../app.js'
import type { Database } from '../db/connection.js'
import { createSessionCookie } from './session.js'

type App = ReturnType<typeof createApp>

export const FLOW_CALLBACK = 'https://claude.example/callback'
export const FLOW_OTHER_CALLBACK = 'http://127.0.0.1:3199/callback'
export const FLOW_CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'

export function s256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export async function registerFlowClient(app: App, name = 'Claude'): Promise<string> {
  const response = await app.request('/api/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: name,
      redirect_uris: [FLOW_CALLBACK, FLOW_OTHER_CALLBACK],
    }),
  })
  return ((await response.json()) as { client_id: string }).client_id
}

// Approves through the decision route with a fresh access session, as the consent screen does.
export async function approveFlowCode(
  app: App,
  db: Database,
  options: { clientId: string; now: Date; resource: string },
): Promise<string> {
  const response = await app.request('/api/oauth/authorization', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: createSessionCookie(db, options.now) },
    body: JSON.stringify({
      response_type: 'code',
      client_id: options.clientId,
      redirect_uri: FLOW_CALLBACK,
      code_challenge: s256(FLOW_CODE_VERIFIER),
      code_challenge_method: 'S256',
      state: 'flow',
      resource: options.resource,
      decision: 'approve',
    }),
  })
  const { redirectTo } = (await response.json()) as { redirectTo: string }
  return new URL(redirectTo).searchParams.get('code') ?? ''
}

export function postToken(app: App, fields: Record<string, string>) {
  return Promise.resolve(
    app.request('/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    }),
  )
}

export type FlowTokens = { access_token: string; refresh_token: string; clientId: string }

export async function obtainTokensThroughFlow(
  app: App,
  db: Database,
  options: { now: Date; resource: string },
): Promise<FlowTokens> {
  const clientId = await registerFlowClient(app)
  const code = await approveFlowCode(app, db, { clientId, ...options })
  const response = await postToken(app, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: FLOW_CALLBACK,
    client_id: clientId,
    code_verifier: FLOW_CODE_VERIFIER,
    resource: options.resource,
  })
  const tokens = (await response.json()) as { access_token: string; refresh_token: string }
  return { ...tokens, clientId }
}

export async function mcpChallenge(app: App, accessToken: string) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      host: 'localhost:3001',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })
  return { status: response.status, wwwAuthenticate: response.headers.get('www-authenticate') }
}
