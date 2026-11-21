import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

export type ToolRegistration = (server: McpServer) => void

export const toolRegistrations: readonly ToolRegistration[] = []

export function registerTools(server: McpServer): void {
  for (const register of toolRegistrations) {
    register(server)
  }

  if (toolRegistrations.length === 0) {
    // McpServer installs the tools/list handler only on the first registerTool call.
    server.server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [] }))
  }
}
