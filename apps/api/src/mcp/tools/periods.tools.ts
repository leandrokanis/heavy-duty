import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DEFAULT_NOTICE_TIME_ZONE } from '../../config/notifications-env.js'
import { getCurrentPeriod, setPeriodIntention } from '../../modules/periods/period.service.js'
import {
  CurrentPeriodSchema,
  PeriodIntentionInputSchema,
} from '../../modules/periods/periods.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

const PERIOD_FIELDS =
  'Returns now (the clock of the API), number (1 for the first period), startsAt and endsAt (UTC instants in ISO 8601; the period is half open, so endsAt is the start of the next one), week (the week of now, 1 to 12; a week is a block of 7 × 24 h from startsAt), weekCount (12), intention (null with none), windows (windowsUsed and windowsMissed in the weeks of the period, usedPercent rounded, null with 0 of 0, and targetPercent 70, the goal O1), volume (baselineVolumeG, the total volume of week 1, and lastWeekVolumeG, the total volume of the last complete week, both null until week 1 ends, changePercent rounded, null with no baseline or a baseline of 0, and targetPercent 20, the goal O4; the total adds the volume of the 11 muscle groups, the secondary muscle at half, and time exercises stay out) and groups (the 11 muscle groups in catalog order, each with windowsUsed, windowsMissed and usedPercent in the period, the progress of the group in the period).'

export function registerPeriodTools(server: McpServer, { db, now, timeZone }: ToolDeps): void {
  const zone = timeZone ?? DEFAULT_NOTICE_TIME_ZONE

  server.registerTool(
    'get_period',
    {
      description: `Get the current period of 12 weeks, which organizes the progress with an intention, the goals of the period and the progress of each muscle group in it. Takes no parameter and only reads. Periods follow each other in blocks of 12 weeks from period 1, which started on Monday at 00:00 of the week of the deploy, in the zone of the server (NOTICE_TIME_ZONE, America/Sao_Paulo by default), with no realignment to the quarter. Levels cross the periods; the goals and the progress in the period start over. A window counts in the week of its outcome, as in get_windows_used, so the history before the period stays out. ${PERIOD_FIELDS} The same object that GET /api/periods/current returns.`,
      inputSchema: z.object({}),
      outputSchema: CurrentPeriodSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => getCurrentPeriod(db, now(), zone)),
  )

  server.registerTool(
    'set_period_intention',
    {
      description: `Write the intention of the current period, a short phrase the athlete sees on the Period screen, such as "Treinar três vezes por semana até o fim do ano." Applies at once, with no preview, and replaces the intention of the current period only; the athlete can also write it on the phone. intention is a text of up to 120 characters after trimming, with runs of spaces and line breaks turned into one space; an empty text removes the intention. A missing intention is refused with period_intention_required and a longer one with period_intention_too_long, and nothing is saved. ${PERIOD_FIELDS}`,
      inputSchema: PeriodIntentionInputSchema,
      outputSchema: CurrentPeriodSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => runTool(() => setPeriodIntention(db, input, now(), zone)),
  )
}
