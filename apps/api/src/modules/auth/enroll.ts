import { existsSync } from 'node:fs'
import { type Environment, loadConfig } from '../../config/env.js'
import { openDatabase } from '../../db/connection.js'
import { isEntryPoint } from '../../db/script.js'
import { createEnrollmentToken } from './enrollment.service.js'

export type EnrollLog = {
  info: (...parts: unknown[]) => void
  error: (...parts: unknown[]) => void
}

export type EnrollCommandDeps = {
  now: () => Date
  log: EnrollLog
}

const COMMAND = 'auth:enroll'

export async function runEnrollCommand(env: Environment, deps: EnrollCommandDeps): Promise<number> {
  try {
    const config = loadConfig(env)
    // openDatabase would create an empty database at a wrong path, and the command never migrates.
    if (!existsSync(config.databasePath)) {
      throw new Error('database file not found at DATABASE_PATH')
    }
    const db = openDatabase(config.databasePath)
    try {
      const { token, expiresAt } = createEnrollmentToken(db, deps.now())
      deps.log.info(`${COMMAND}: open this link on the phone before ${expiresAt}:`)
      deps.log.info(`${config.appOrigin}/cadastro#token=${token}`)
      return 0
    } finally {
      db.$client.close()
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    deps.log.error(`${COMMAND}: no enrollment link created: ${detail}`)
    return 1
  }
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = await runEnrollCommand(process.env, { now: () => new Date(), log: console })
}
