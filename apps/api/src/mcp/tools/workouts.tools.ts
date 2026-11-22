import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listWorkouts } from '../../modules/workouts/workout-history.service.js'
import {
  ListWorkoutsQuerySchema,
  WorkoutHistorySchema,
} from '../../modules/workouts/workouts.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerWorkoutTools(server: McpServer, { db }: ToolDeps): void {
  server.registerTool(
    'list_workouts',
    {
      description:
        'List the recorded workouts that started in an interval, oldest first. from and to are UTC instants in ISO 8601 with a Z (2026-11-09T03:00:00.000Z); the interval is half open, so a workout starting exactly at from is included and one starting exactly at to is not (to is exclusive). The interval must be at most 92 days. The API does no time zone conversion: midnight in America/Sao_Paulo is 03:00Z, so the week from Monday 2026-11-09 to Monday 2026-11-16 is from 2026-11-09T03:00:00.000Z to 2026-11-16T03:00:00.000Z. Each workout has its program, letter, current label of the letter, startedAt, finishedAt and endReason (null while in progress), exercises with their sets (setNumber, loadG in grams, reps or seconds, performedAt, correctedAt when the set was corrected) and leftOut, the exercises that were skipped and not done. Returns an empty list when no workout started in the interval.',
      inputSchema: ListWorkoutsQuerySchema,
      outputSchema: WorkoutHistorySchema,
      annotations: { readOnlyHint: true },
    },
    (input) => runTool(() => listWorkouts(db, input)),
  )
}
