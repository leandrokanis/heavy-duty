import type { Database } from './connection.js'
import { isEntryPoint, runDatabaseScript } from './script.js'

export function runSeed(_db: Database): void {}

if (isEntryPoint(import.meta.url)) {
  runDatabaseScript('db:seed', runSeed)
}
