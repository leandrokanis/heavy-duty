import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../../db/connection.js'
import { runMigrations } from '../../db/migrate.js'
import { type EnrollCommandDeps, runEnrollCommand } from './enroll.js'

const NOW = new Date('2026-11-21T12:00:00.000Z')

type CapturedLog = { lines: string[]; log: EnrollCommandDeps['log'] }

function captureLog(): CapturedLog {
  const lines: string[] = []
  const push = (...parts: unknown[]) => lines.push(parts.map(String).join(' '))
  return { lines, log: { info: push, error: push } }
}

describe('Given a temporary folder for the database', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-enroll-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When auth:enroll runs on a migrated database', () => {
    it('Then should exit 0 and print a link with a 43 character token and the expiry 15 minutes later, storing only the SHA-256 of the token', async () => {
      const databasePath = join(folder, 'heavy-duty.sqlite')
      const db = openDatabase(databasePath)
      runMigrations(db)
      db.$client.close()
      const { lines, log } = captureLog()

      const exitCode = await runEnrollCommand(
        { NODE_ENV: 'development', DATABASE_PATH: databasePath },
        { now: () => NOW, log },
      )
      const output = lines.join('\n')
      const token =
        /http:\/\/localhost:8080\/cadastro#token=([A-Za-z0-9_-]{43})(\s|$)/.exec(output)?.[1] ?? ''
      const check = openDatabase(databasePath)
      const stored = check.$client
        .prepare('SELECT token_hash, expires_at FROM enrollment_tokens')
        .all()
      check.$client.close()

      expect({
        exitCode,
        tokenLength: token.length,
        printsExpiry: output.includes('2026-11-21T12:15:00.000Z'),
        stored,
      }).toEqual({
        exitCode: 0,
        tokenLength: 43,
        printsExpiry: true,
        stored: [
          {
            token_hash: createHash('sha256').update(token).digest('hex'),
            expires_at: '2026-11-21T12:15:00.000Z',
          },
        ],
      })
    })
  })

  describe('When auth:enroll runs on a database without the migrations', () => {
    it('Then should exit 1, print no link and log the missing enrollment_tokens table', async () => {
      const databasePath = join(folder, 'heavy-duty.sqlite')
      openDatabase(databasePath).$client.close()
      const { lines, log } = captureLog()

      const exitCode = await runEnrollCommand(
        { NODE_ENV: 'development', DATABASE_PATH: databasePath },
        { now: () => NOW, log },
      )
      const output = lines.join('\n')

      expect({
        exitCode,
        printsLink: output.includes('/cadastro#token='),
        namesTable: output.includes('enrollment_tokens'),
      }).toEqual({ exitCode: 1, printsLink: false, namesTable: true })
    })
  })

  describe('When auth:enroll runs with a database path that does not exist', () => {
    it('Then should exit 1 and create no file', async () => {
      const databasePath = join(folder, 'missing', 'heavy-duty.sqlite')
      const { lines, log } = captureLog()

      const exitCode = await runEnrollCommand(
        { NODE_ENV: 'development', DATABASE_PATH: databasePath },
        { now: () => NOW, log },
      )

      expect({
        exitCode,
        printsLink: lines.join('\n').includes('/cadastro#token='),
        created: existsSync(databasePath),
      }).toEqual({ exitCode: 1, printsLink: false, created: false })
    })
  })
})
