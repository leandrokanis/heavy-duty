import { existsSync } from 'node:fs'
import { type Environment, loadConfig } from '../../config/env.js'
import { openDatabase } from '../../db/connection.js'
import { isEntryPoint } from '../../db/script.js'
import { revokeAllAuthorizations } from './oauth.service.js'

export type RevokeMcpLog = {
  info: (...parts: unknown[]) => void
  error: (...parts: unknown[]) => void
}

export type RevokeMcpCommandDeps = {
  now: () => Date
  log: RevokeMcpLog
}

const COMMAND = 'auth:revoke-mcp'

export async function runRevokeMcpCommand(
  env: Environment,
  deps: RevokeMcpCommandDeps,
): Promise<number> {
  try {
    const config = loadConfig(env)
    // openDatabase would create an empty database at a wrong path, and the command never migrates.
    if (!existsSync(config.databasePath)) {
      throw new Error('database file not found at DATABASE_PATH')
    }
    const db = openDatabase(config.databasePath)
    try {
      const revoked = revokeAllAuthorizations(db, deps.now())
      deps.log.info(
        `${COMMAND}: revoked ${revoked.grants} MCP authorization(s) and ${revoked.codes} pending code(s)`,
      )
      return 0
    } finally {
      db.$client.close()
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    deps.log.error(`${COMMAND}: nothing revoked: ${detail}`)
    return 1
  }
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = await runRevokeMcpCommand(process.env, { now: () => new Date(), log: console })
}
