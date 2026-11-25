import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SystemStatusSchema } from '../../modules/system/system.schemas.js'
import { getSystemStatus } from '../../modules/system/system-status.service.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerSystemTools(server: McpServer, { db, noticeChannels }: ToolDeps): void {
  server.registerTool(
    'get_system_status',
    {
      description:
        'Report the status of the app. backup: the latest run of the daily backup, the last successful run and up to 7 recent runs, newest first; each run has startedAt and finishedAt in UTC (ISO 8601), status (succeeded or failed), sizeBytes and the failure reason in error; latestRun and lastSuccessfulRun are null when no such run exists. notices: one entry per channel of the window and level drop notices, push then email, with configured (false when the server has no configuration for the channel, so nothing goes out by it), lastSentAt (UTC, null before the first send) and up to 5 recentFailures, newest first, each with failedAt, kind (window_open, window_close or level_drop), letter and the safe reason in error.',
      inputSchema: z.object({}),
      outputSchema: SystemStatusSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => getSystemStatus(db, noticeChannels)),
  )
}
