import { seedMuscleGroups } from '../modules/catalog/muscle-group.catalog.js'
import type { Database } from './connection.js'
import { isEntryPoint, runDatabaseScript } from './script.js'

export function runSeed(db: Database): void {
  seedMuscleGroups(db)
}

if (isEntryPoint(import.meta.url)) {
  runDatabaseScript('db:seed', runSeed)
}
