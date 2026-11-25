import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  EmailNoticesInputSchema,
  EmailNoticesSchema,
} from '../../modules/notifications/email-settings.schemas.js'
import { setEmailNotices } from '../../modules/notifications/email-settings.service.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerNotificationTools(server: McpServer, { db, now }: ToolDeps): void {
  server.registerTool(
    'set_email_notices',
    {
      description:
        'Turn the notices by email on or off. The athlete turns them off from the link in an email; call this with enabled true when the athlete asks to receive the emails again. Applies at once, with no preview: it changes no workout history. The notices on the phone are not affected. Returns emailEnabled and updatedAt (the clock of the API, a UTC instant in ISO 8601).',
      inputSchema: EmailNoticesInputSchema,
      outputSchema: EmailNoticesSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => runTool(() => setEmailNotices(db, input, now())),
  )
}
