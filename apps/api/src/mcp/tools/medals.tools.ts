import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DEFAULT_NOTICE_TIME_ZONE } from '../../config/notifications-env.js'
import { listMedals } from '../../modules/medals/medal.service.js'
import { MedalsSchema } from '../../modules/medals/medals.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerMedalTools(server: McpServer, { db, now, timeZone }: ToolDeps): void {
  const zone = timeZone ?? DEFAULT_NOTICE_TIME_ZONE

  server.registerTool(
    'list_medals',
    {
      description:
        'List the medals of the athlete: the whole catalog, with the award of each one. Takes no parameter and changes no history: before answering, it records the medals the history already reached and were not recorded yet, as the game scheduler does every minute. Each medal is awarded once and never taken away, not even when a workout is corrected or removed (the removal only sets workoutId to null) or when the level of the group drops. Only events from the start of period 1 award a medal; the history before it still sets the records, the levels and the windows. The catalog: first_record (the first set that beats a record of the exercise: more load for the same reps or more reps for the same load), first_window (the first muscle group trained in its activity window), weekly_goal (the first week of the period with the windows used reaching the weekly goal), week_streak_4 (the streak of weeks reaches 4), level_10 and level_20 (a muscle group at level 10, or 20, or above right after a set; subject names the group), volume_up_20 (a week of the period whose total volume reaches 120% of week 1 of the period, the baseline of the goal O4; each set counts in the week of its instant, the secondary muscle at half, time exercises out), full_period (a workout in each of the 12 weeks of a period) and two hidden ones, all_letters_in_week (every letter of the active program in the same week) and window_saved_at_end (a group trained in its window in the 12 hours before it closes). Returns now (the clock of the API) and medals in catalog order, each with code, name and criterion (in Portuguese, as the app shows them), icon, hidden, awardedAt (the UTC instant of the event in ISO 8601, not of its detection; null when not awarded), subject (slug and name of the muscle group of a level medal, null otherwise) and workoutId (the workout of the event, null when not awarded, with no workout or with the workout removed). A hidden medal not yet awarded comes with name, criterion and icon null, as on the shelf of the app. The same object that GET /api/medals returns.',
      inputSchema: z.object({}),
      outputSchema: MedalsSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => listMedals(db, now(), zone)),
  )
}
