import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Database } from '../../db/connection.js'
import { registerCatalogTools } from './catalog.tools.js'
import { registerSystemTools } from './system.tools.js'

export type ToolDeps = {
  db: Database
}

export type ToolRegistration = (server: McpServer, deps: ToolDeps) => void

export const toolRegistrations: readonly ToolRegistration[] = [
  registerCatalogTools,
  registerSystemTools,
]

export function registerTools(server: McpServer, deps: ToolDeps | undefined): void {
  if (!deps) {
    // McpServer installs the tools/list handler only on the first registerTool call.
    server.server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [] }))
    return
  }

  for (const register of toolRegistrations) {
    register(server, deps)
  }
}
