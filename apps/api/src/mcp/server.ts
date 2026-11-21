import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { Context } from 'hono'
import { registerTools, type ToolDeps } from './tools/index.js'

export const MCP_PATH = '/mcp'

export function createMcpServer(deps: ToolDeps): McpServer {
  const server = new McpServer(
    { name: 'heavy-duty', version: '0.0.0' },
    { capabilities: { tools: {} } },
  )
  registerTools(server, deps)
  return server
}

// Stateless transport, one server per request, see ADR-006.
export async function handleMcpRequest(c: Context, deps: ToolDeps): Promise<Response> {
  const server = createMcpServer(deps)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  try {
    return await transport.handleRequest(c.req.raw)
  } finally {
    await server.close()
  }
}
