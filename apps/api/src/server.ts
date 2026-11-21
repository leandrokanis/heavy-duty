import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfig } from './config/env.js'
import { type Database, openDatabase } from './db/connection.js'
import { createDatabaseHealthProbe } from './db/health.js'
import type { DatabaseHealthProbe } from './modules/system/health.service.js'

type DatabaseState = {
  db: Database | undefined
  databaseHealth: DatabaseHealthProbe
}

function openDatabaseState(databasePath: string): DatabaseState {
  try {
    const db = openDatabase(databasePath)
    return { db, databaseHealth: createDatabaseHealthProbe(db) }
  } catch (error) {
    // Keep serving so /api/health can report the database as down.
    console.error(`Could not open the database at ${databasePath}:`, error)
    return { db: undefined, databaseHealth: () => false }
  }
}

const config = loadConfig(process.env)
const { db, databaseHealth } = openDatabaseState(config.databasePath)
const app = createApp({
  nodeEnv: config.nodeEnv,
  databaseHealth,
  db,
  mcpAllowedHosts: config.mcpAllowedHosts,
})

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Heavy Duty API listening on port ${info.port} (${config.nodeEnv})`)
})

function shutdown(): void {
  server.close(() => {
    db?.$client.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
