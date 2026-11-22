import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Database } from '../../db/connection.js'
import { registerCatalogTools } from './catalog.tools.js'
import { registerProgramTools } from './programs.tools.js'
import { registerSystemTools } from './system.tools.js'
import { registerWorkoutTools } from './workouts.tools.js'

export type ToolDeps = {
  db: Database
  now: () => Date
}

export type ToolRegistration = (server: McpServer, deps: ToolDeps) => void

export const toolRegistrations: readonly ToolRegistration[] = [
  registerCatalogTools,
  registerProgramTools,
  registerSystemTools,
  registerWorkoutTools,
]

export function registerTools(server: McpServer, deps: ToolDeps): void {
  for (const register of toolRegistrations) {
    register(server, deps)
  }
}
