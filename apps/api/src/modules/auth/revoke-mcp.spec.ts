import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { openDatabase } from '../../db/connection.js'
import { runMigrations } from '../../db/migrate.js'
import {
  approveFlowCode,
  FLOW_CALLBACK,
  FLOW_CODE_VERIFIER,
  mcpChallenge,
  obtainTokensThroughFlow,
  postToken,
} from '../../test/oauth-flow.js'
import { type RevokeMcpCommandDeps, runRevokeMcpCommand } from './revoke-mcp.js'

const NOW = new Date('2026-11-21T12:00:00.000Z')
const RESOURCE = 'https://hd.example/mcp'

function captureLog() {
  const lines: string[] = []
  const push = (...parts: unknown[]) => lines.push(parts.map(String).join(' '))
  const log: RevokeMcpCommandDeps['log'] = { info: push, error: push }
  return { lines, log }
}

describe('Given a temporary folder for the database', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-revoke-mcp-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  async function givenActiveGrantAndPendingCode() {
    const databasePath = join(folder, 'heavy-duty.sqlite')
    const db = openDatabase(databasePath)
    runMigrations(db)
    const app = createApp({
      nodeEnv: 'production',
      databaseHealth: () => true,
      db,
      appOrigin: 'https://hd.example',
      now: () => NOW,
    })
    const tokens = await obtainTokensThroughFlow(app, db, { now: NOW, resource: RESOURCE })
    const pendingCode = await approveFlowCode(app, db, {
      clientId: tokens.clientId,
      now: NOW,
      resource: RESOURCE,
    })
    return { databasePath, db, app, tokens, pendingCode }
  }

  describe('When auth:revoke-mcp runs on a database with an active grant and a pending code', () => {
    it('Then should exit 0 printing the count, and the old credential, refresh token and code should be refused', async () => {
      const { databasePath, db, app, tokens, pendingCode } = await givenActiveGrantAndPendingCode()
      const { lines, log } = captureLog()

      const exitCode = await runRevokeMcpCommand(
        { NODE_ENV: 'development', DATABASE_PATH: databasePath },
        { now: () => NOW, log },
      )
      const credential = await mcpChallenge(app, tokens.access_token)
      const refreshed = await postToken(app, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: tokens.clientId,
      })
      const exchanged = await postToken(app, {
        grant_type: 'authorization_code',
        code: pendingCode,
        redirect_uri: FLOW_CALLBACK,
        client_id: tokens.clientId,
        code_verifier: FLOW_CODE_VERIFIER,
      })
      db.$client.close()

      expect({
        exitCode,
        output: lines,
        credentialStatus: credential.status,
        refresh: {
          status: refreshed.status,
          error: ((await refreshed.json()) as { error: string }).error,
        },
        code: {
          status: exchanged.status,
          error: ((await exchanged.json()) as { error: string }).error,
        },
      }).toEqual({
        exitCode: 0,
        output: ['auth:revoke-mcp: revoked 1 MCP authorization(s) and 1 pending code(s)'],
        credentialStatus: 401,
        refresh: { status: 400, error: 'invalid_grant' },
        code: { status: 400, error: 'invalid_grant' },
      })
    })
  })

  describe('When auth:revoke-mcp runs with DATABASE_PATH pointing to a file that does not exist', () => {
    it('Then should exit 1 without creating the file', async () => {
      const databasePath = join(folder, 'missing.sqlite')
      const { lines, log } = captureLog()

      const exitCode = await runRevokeMcpCommand(
        { NODE_ENV: 'development', DATABASE_PATH: databasePath },
        { now: () => NOW, log },
      )

      expect({ exitCode, created: existsSync(databasePath), output: lines }).toEqual({
        exitCode: 1,
        created: false,
        output: ['auth:revoke-mcp: nothing revoked: database file not found at DATABASE_PATH'],
      })
    })
  })
})
