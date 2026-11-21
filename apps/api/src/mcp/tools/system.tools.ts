import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SystemStatusSchema } from '../../modules/system/system.schemas.js'
import { getSystemStatus } from '../../modules/system/system-status.service.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerSystemTools(server: McpServer, { db }: ToolDeps): void {
  server.registerTool(
    'get_system_status',
    {
      description:
        'Report the daily backup status: the latest run, the last successful run and up to 7 recent runs, newest first. Each run has startedAt and finishedAt in UTC (ISO 8601), status (succeeded or failed), sizeBytes and the failure reason in error. latestRun and lastSuccessfulRun are null when no such run exists.',
      inputSchema: z.object({}),
      outputSchema: SystemStatusSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => getSystemStatus(db)),
  )
}
