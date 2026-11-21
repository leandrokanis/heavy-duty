import { sql } from 'drizzle-orm'
import type { DatabaseHealthProbe } from '../modules/system/health.service.js'
import type { Database } from './connection.js'

export function createDatabaseHealthProbe(db: Database): DatabaseHealthProbe {
  return () => {
    try {
      db.get(sql`SELECT 1`)
      return true
    } catch (error) {
      console.error('Database did not answer SELECT 1:', error)
      return false
    }
  }
}
