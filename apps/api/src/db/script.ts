import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../config/env.js'
import { type Database, openDatabase } from './connection.js'

export function isEntryPoint(moduleUrl: string): boolean {
  const entry = process.argv[1]
  return entry !== undefined && resolve(entry) === fileURLToPath(moduleUrl)
}

export function runDatabaseScript(name: string, task: (db: Database) => void): void {
  const { databasePath } = loadConfig(process.env)
  const db = openDatabase(databasePath)
  try {
    task(db)
    console.log(`${name}: done (${databasePath})`)
  } finally {
    db.$client.close()
  }
}
