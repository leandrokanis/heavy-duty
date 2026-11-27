import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  EmailNoticesInputSchema,
  EmailNoticesSchema,
} from '../../modules/notifications/email-settings.schemas.js'
import { setEmailNotices } from '../../modules/notifications/email-settings.service.js'
import {
  WeeklyDigestQuerySchema,
  WeeklyDigestSchema,
} from '../../modules/notifications/weekly-digest.schemas.js'
import { getWeeklyDigest } from '../../modules/notifications/weekly-digest.service.js'
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

  server.registerTool(
    'get_weekly_digest',
    {
      description:
        'Show the weekly digest the athlete receives by email, to check it with no email sent and no SMTP server configured. Read only. at is an optional UTC instant in ISO 8601 inside the week to show, from period 1 to the week of now; with no at, it shows the last week that ended (the current week before the first one ends). A week of the period is a block of 7 × 24 h from the start of the period, Monday at 00:00 in the zone of the server (NOTICE_TIME_ZONE). An instant outside those weeks is refused with weekly_digest_week_invalid. The email itself goes on Monday at 7h with the week that ended, only by email, and a server back from a stop still sends it up to 24 h later, never between 22h and 7h. Returns now, weekStartsAt and weekEndsAt, ended (false for the week of now, whose numbers can still change), subject (the subject of the email: "Sua semana: 3 de 5 janelas", or the windows used alone with no goal), weeklyGoal (null with none), windowsUsed and windowsMissed in the week (each window in the week of its outcome, as get_windows_used), weekPoints (the points of the workouts that started in the week), weekStreak (the streak of weeks at the end of the week, as get_period), levels (the muscle groups whose level changed in the week, with from and to), records (the names of the exercises with a record set in the week, with no load) and medals (the names of the medals awarded in the week, the group of a level medal after a dot).',
      inputSchema: WeeklyDigestQuerySchema,
      outputSchema: WeeklyDigestSchema,
      annotations: { readOnlyHint: true },
    },
    (input) => runTool(() => getWeeklyDigest(db, input, now())),
  )
}
