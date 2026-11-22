import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listWorkouts } from '../../modules/workouts/workout-history.service.js'
import { removeWorkout } from '../../modules/workouts/workout-removal.service.js'
import { editWorkoutSet } from '../../modules/workouts/workout-set-edit.service.js'
import {
  EditWorkoutSetInputSchema,
  ListWorkoutsQuerySchema,
  RemoveWorkoutInputSchema,
  WorkoutHistorySchema,
  WorkoutRemovalSchema,
  WorkoutSetEditSchema,
} from '../../modules/workouts/workouts.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

const CONFIRMATION_HINT =
  'Two calls are needed. The first call, without confirmationCode, changes nothing and returns a preview (applied false) with a confirmationCode. Show the preview to the PO and wait for the confirmation of the PO in the conversation; only then repeat the same request with the confirmationCode. The code is valid only for the same request on the same workout state; if the workout changed, the call is refused and a new preview is needed.'

export function registerWorkoutTools(server: McpServer, { db, now }: ToolDeps): void {
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

  server.registerTool(
    'remove_workout',
    {
      description: `Remove a recorded workout with its sets and skips; this cannot be undone. The workoutId comes from list_workouts. ${CONFIRMATION_HINT} A workout without finishedAt may come back if the phone still has sets to send.`,
      inputSchema: RemoveWorkoutInputSchema,
      outputSchema: WorkoutRemovalSchema,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (input) => runTool(() => removeWorkout(db, input)),
  )

  server.registerTool(
    'update_workout_set',
    {
      description: `Replace the load and the measure of a recorded set. The workoutId and the setId come from list_workouts; loadG is in grams and the measure is reps (reps exercise) or seconds (time exercise), never both. ${CONFIRMATION_HINT}`,
      inputSchema: EditWorkoutSetInputSchema,
      outputSchema: WorkoutSetEditSchema,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (input) => runTool(() => editWorkoutSet(db, input, now)),
  )
}
