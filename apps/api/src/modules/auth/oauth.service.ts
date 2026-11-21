import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { generateToken, hashToken } from './auth-token.js'
import { OAuthError, oauthClientUnknown, oauthRedirectUriInvalid } from './oauth.errors.js'
import {
  countNeverApproved,
  deleteNeverApprovedCreatedBefore,
  deleteOldestNeverApproved,
  findClientById,
  insertClient,
  markClientApproved,
} from './oauth-client.repository.js'
import { consumeCode, insertCode, spendPendingCodes } from './oauth-code.repository.js'
import { mcpResourceOf } from './oauth-endpoints.js'
import {
  deleteExpiredGrantsAndCodes,
  findGrantByAccessTokenHash,
  findGrantByPreviousRefreshTokenHash,
  findGrantByRefreshTokenHash,
  insertGrant,
  revokeActiveGrants,
  revokeGrant,
  rotateGrant,
} from './oauth-grant.repository.js'
import { verifyS256 } from './pkce.js'

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000
export const NEVER_APPROVED_CLIENT_TTL_MS = 24 * 60 * 60 * 1000
export const NEVER_APPROVED_CLIENT_CAPACITY = 20
const MAX_REDIRECT_URIS = 5
const MAX_REDIRECT_URI_LENGTH = 2048
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]'])

export type RegisteredClient = {
  id: string
  clientName: string | null
  redirectUris: string[]
  createdAt: string
}

export type IssuedTokens = {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

function newTokens(now: Date) {
  const accessToken = generateToken()
  const refreshToken = generateToken()
  return {
    issued: { accessToken, refreshToken, expiresInSeconds: ACCESS_TOKEN_TTL_MS / 1000 },
    stored: {
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS).toISOString(),
      refreshTokenHash: hashToken(refreshToken),
      refreshExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS).toISOString(),
    },
  }
}

export function issueGrant(
  db: Database,
  request: { clientId: string; resource: string },
  now: Date,
): IssuedTokens {
  deleteExpiredGrantsAndCodes(db, now.toISOString())
  const tokens = newTokens(now)
  insertGrant(db, {
    id: createId(now.getTime()),
    clientId: request.clientId,
    resource: request.resource,
    ...tokens.stored,
    previousRefreshTokenHash: null,
    createdAt: now.toISOString(),
    revokedAt: null,
  })
  return tokens.issued
}

export function validateAccessToken(
  db: Database,
  accessToken: string,
  expected: { resource: string; now: Date },
): boolean {
  const grant = findGrantByAccessTokenHash(db, hashToken(accessToken))
  return (
    grant !== undefined &&
    grant.revokedAt === null &&
    grant.accessExpiresAt > expected.now.toISOString() &&
    grant.resource === expected.resource
  )
}

function isAllowedRedirectUri(value: string): boolean {
  if (value.length > MAX_REDIRECT_URI_LENGTH || value.includes('#')) {
    return false
  }
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname))
    )
  } catch {
    return false
  }
}

// Registration is public, so never approved clients are capped and the oldest is evicted, see ADR-020.
export function registerClient(
  db: Database,
  metadata: { clientName?: string; redirectUris?: string[] },
  now: Date,
): RegisteredClient {
  const redirectUris = metadata.redirectUris ?? []
  if (
    redirectUris.length === 0 ||
    redirectUris.length > MAX_REDIRECT_URIS ||
    !redirectUris.every(isAllowedRedirectUri)
  ) {
    throw new OAuthError(
      'invalid_redirect_uri',
      'redirect_uris must hold 1 to 5 https or loopback URIs without fragment',
    )
  }
  const client = {
    id: createId(now.getTime()),
    clientName: metadata.clientName ?? null,
    redirectUris,
    createdAt: now.toISOString(),
  }
  db.transaction(() => {
    const staleBefore = new Date(now.getTime() - NEVER_APPROVED_CLIENT_TTL_MS).toISOString()
    deleteNeverApprovedCreatedBefore(db, staleBefore)
    const overflow = countNeverApproved(db) - NEVER_APPROVED_CLIENT_CAPACITY + 1
    if (overflow > 0) {
      deleteOldestNeverApproved(db, overflow)
    }
    insertClient(db, { ...client, redirectUris: JSON.stringify(redirectUris), approvedAt: null })
  })
  return client
}

export type AuthorizationRequest = {
  response_type?: string
  client_id?: string
  redirect_uri?: string
  code_challenge?: string
  code_challenge_method?: string
  state?: string
  resource?: string
}

export type CheckedAuthorization =
  | {
      kind: 'valid'
      clientId: string
      clientName: string | null
      redirectUri: string
      codeChallenge: string
      resource: string
      state: string | undefined
    }
  | { kind: 'error_redirect'; redirectTo: string }

export function buildRedirect(
  redirectUri: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(redirectUri)
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.append(name, value)
  }
  return url.toString()
}

// Client and redirect_uri come first: until both are trusted, nothing may redirect (OAuth 2.1, 4.1.2.1).
export function checkAuthorizationRequest(
  db: Database,
  request: AuthorizationRequest,
  appOrigin: string,
): CheckedAuthorization {
  const client = request.client_id ? findClientById(db, request.client_id) : undefined
  if (!client) {
    throw oauthClientUnknown()
  }
  const redirectUris = JSON.parse(client.redirectUris) as string[]
  const redirectUri = request.redirect_uri
  if (redirectUri === undefined || !redirectUris.includes(redirectUri)) {
    throw oauthRedirectUriInvalid()
  }
  const errorRedirect = (error: string) => ({
    kind: 'error_redirect' as const,
    redirectTo: buildRedirect(redirectUri, { error, state: request.state }),
  })
  if (
    request.response_type !== 'code' ||
    !request.code_challenge ||
    request.code_challenge_method !== 'S256'
  ) {
    return errorRedirect('invalid_request')
  }
  const resource = mcpResourceOf(appOrigin)
  if (request.resource !== undefined && request.resource !== resource) {
    return errorRedirect('invalid_target')
  }
  return {
    kind: 'valid',
    clientId: client.id,
    clientName: client.clientName,
    redirectUri,
    codeChallenge: request.code_challenge,
    resource,
    state: request.state,
  }
}

// The request is checked again, so a decision can only approve what the preview showed as valid.
export function decideAuthorization(
  db: Database,
  request: AuthorizationRequest & { decision: 'approve' | 'deny' },
  appOrigin: string,
  now: Date,
): { redirectTo: string } {
  const checked = checkAuthorizationRequest(db, request, appOrigin)
  if (checked.kind === 'error_redirect') {
    return { redirectTo: checked.redirectTo }
  }
  if (request.decision === 'deny') {
    return {
      redirectTo: buildRedirect(checked.redirectUri, {
        error: 'access_denied',
        state: checked.state,
      }),
    }
  }
  const code = generateToken()
  const nowIso = now.toISOString()
  db.transaction(() => {
    insertCode(db, {
      id: createId(now.getTime()),
      codeHash: hashToken(code),
      clientId: checked.clientId,
      redirectUri: checked.redirectUri,
      codeChallenge: checked.codeChallenge,
      resource: checked.resource,
      createdAt: nowIso,
      expiresAt: new Date(now.getTime() + AUTHORIZATION_CODE_TTL_MS).toISOString(),
      usedAt: null,
    })
    markClientApproved(db, checked.clientId, nowIso)
  })
  return { redirectTo: buildRedirect(checked.redirectUri, { code, state: checked.state }) }
}

export type TokenRequest = {
  grant_type?: string
  code?: string
  redirect_uri?: string
  client_id?: string
  code_verifier?: string
  refresh_token?: string
  resource?: string
}

function requireClient(db: Database, clientId: string | undefined) {
  const client = clientId ? findClientById(db, clientId) : undefined
  if (!client) {
    throw new OAuthError('invalid_client', 'client_id is unknown', 401)
  }
  return client
}

function invalidGrant(): OAuthError {
  return new OAuthError('invalid_grant', 'the grant is invalid, expired, revoked or was used')
}

function exchangeCode(db: Database, request: TokenRequest, now: Date): IssuedTokens {
  if (!request.code || !request.redirect_uri || !request.code_verifier) {
    throw new OAuthError('invalid_request', 'code, redirect_uri and code_verifier are required')
  }
  const client = requireClient(db, request.client_id)
  const { code, redirect_uri: redirectUri, code_verifier: codeVerifier } = request
  return db.transaction(() => {
    const stored = consumeCode(db, hashToken(code), now.toISOString())
    if (
      !stored ||
      stored.clientId !== client.id ||
      stored.redirectUri !== redirectUri ||
      !verifyS256(codeVerifier, stored.codeChallenge)
    ) {
      throw invalidGrant()
    }
    if (request.resource !== undefined && request.resource !== stored.resource) {
      throw new OAuthError('invalid_target', 'resource does not match the authorization')
    }
    return issueGrant(db, { clientId: client.id, resource: stored.resource }, now)
  })
}

// A rotated refresh token that comes back signals a leak, so the whole grant is revoked (RFC 9700, 4.14.2).
function refreshGrant(db: Database, request: TokenRequest, now: Date): IssuedTokens {
  if (!request.refresh_token) {
    throw new OAuthError('invalid_request', 'refresh_token is required')
  }
  const client = requireClient(db, request.client_id)
  const refreshTokenHash = hashToken(request.refresh_token)
  const nowIso = now.toISOString()
  const grant = findGrantByRefreshTokenHash(db, refreshTokenHash)
  if (!grant) {
    const reused = findGrantByPreviousRefreshTokenHash(db, refreshTokenHash)
    if (reused && reused.clientId === client.id) {
      revokeGrant(db, reused.id, nowIso)
    }
    throw invalidGrant()
  }
  if (
    grant.clientId !== client.id ||
    grant.revokedAt !== null ||
    grant.refreshExpiresAt <= nowIso
  ) {
    throw invalidGrant()
  }
  if (request.resource !== undefined && request.resource !== grant.resource) {
    throw new OAuthError('invalid_target', 'resource does not match the authorization')
  }
  return db.transaction(() => {
    deleteExpiredGrantsAndCodes(db, nowIso)
    const tokens = newTokens(now)
    rotateGrant(db, grant.id, { ...tokens.stored, previousRefreshTokenHash: refreshTokenHash })
    return tokens.issued
  })
}

export function exchangeToken(db: Database, request: TokenRequest, now: Date): IssuedTokens {
  if (!request.grant_type) {
    throw new OAuthError('invalid_request', 'grant_type is required')
  }
  if (request.grant_type === 'authorization_code') {
    return exchangeCode(db, request, now)
  }
  if (request.grant_type === 'refresh_token') {
    return refreshGrant(db, request, now)
  }
  throw new OAuthError(
    'unsupported_grant_type',
    'grant_type must be authorization_code or refresh_token',
  )
}

export function revokeAllAuthorizations(
  db: Database,
  now: Date,
): { grants: number; codes: number } {
  const nowIso = now.toISOString()
  return db.transaction(() => ({
    grants: revokeActiveGrants(db, nowIso),
    codes: spendPendingCodes(db, nowIso),
  }))
}
