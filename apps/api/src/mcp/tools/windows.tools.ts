import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getMuscleGroupVolume } from '../../modules/windows/volume.service.js'
import { simulateActivityWindows } from '../../modules/windows/window-simulation.service.js'
import { listActivityWindows } from '../../modules/windows/window-state.service.js'
import {
  ActivityWindowSimulationSchema,
  ActivityWindowsSchema,
  MuscleGroupVolumeQuerySchema,
  MuscleGroupVolumeSchema,
  SimulateActivityWindowsQuerySchema,
} from '../../modules/windows/windows.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerWindowTools(server: McpServer, { db, now }: ToolDeps): void {
  server.registerTool(
    'get_muscle_group_volume',
    {
      description:
        'Get the training volume of each muscle group in an interval, with the volume of the previous interval of the same length and the percent change. from and to are UTC instants in ISO 8601 with a Z (2026-11-09T03:00:00.000Z); the interval is half open, so a set performed exactly at from is included and one performed exactly at to is not. The interval must be at most 92 days. The API does no time zone conversion: midnight in America/Sao_Paulo is 03:00Z, so the week from Monday 2026-11-09 to Monday 2026-11-16 is from 2026-11-09T03:00:00.000Z to 2026-11-16T03:00:00.000Z. The previous interval is previousFrom to previousTo, which ends at from. Returns the 11 muscle groups in catalog order, each with volumeG (load in grams times reps, an integer), previousVolumeG, changePercent (the percent change rounded to a whole number, null when previousVolumeG is 0), timeSeconds and previousTimeSeconds. A muscle group with a primary muscle in the exercise gets the whole volume of each set once; a group with only secondary muscles gets half, rounded down. Time exercises add their seconds to timeSeconds and stay out of volumeG. Sets of workouts in progress or ended early count.',
      inputSchema: MuscleGroupVolumeQuerySchema,
      outputSchema: MuscleGroupVolumeSchema,
      annotations: { readOnlyHint: true },
    },
    (input) => runTool(() => getMuscleGroupVolume(db, input)),
  )

  server.registerTool(
    'simulate_activity_windows',
    {
      description:
        'Simulate the activity window of each muscle group over the recorded history, to calibrate the rule before it shows in the app. Read only: the parameters you pass apply to this call and never change the app; a later call without parameters uses the starting ones. Every parameter is optional and an integer, and you can pass any subset: secondaryVolumePercent (0 to 1000, the share of volume a secondary muscle adds), goalVolumePercent (0 to 1000, per goal: strength, hypertrophy, endurance), baseOpenHours (hours until the window opens with no volume, 1 to 8760, per goal), openMinutesPerAdjustedKg (minutes added per kg of adjusted volume, 0 to 600), maxOpenHours (cap of the hours until the window opens, 1 to 8760 and at least each baseOpenHours) and openDurationHours (hours the window stays open, 1 to 8760, per goal). An invalid parameter is refused with window_parameters_invalid and its name. muscleGroupSlug filters one group; an unknown slug is refused with muscle_group_not_found. from and to are UTC instants in ISO 8601 with a Z (2025-03-03T03:00:00.000Z), half open, at most 366 days, and must come together or not at all; they only filter the trainings returned by the instant of the training, while the whole history feeds the calculation, so the first training of the interval still has its relation to the window before it. A training of a group is a workout with a set of an exercise whose primary muscle is in the group; its instant is the last such set. Volume adds the sets of the whole workout (primary muscle whole, secondary muscle by secondaryVolumePercent, time exercises add 0) and the adjusted volume is volumeG times goalVolumePercent of the current goal of the program. The window opens at the training instant plus baseOpenHours plus openMinutesPerAdjustedKg per kg of adjusted volume, up to maxOpenHours, and closes openDurationHours later. Returns the effective parameters, from and to (null with no interval) and the groups that have trainings, in catalog order, each with muscleGroup, a summary (windowsUsed, windowsMissed, trainedEarly, usedPercent rounded, null with no used or missed window) and trainings in time order, each with workoutId, letter, trainedAt, goal, volumeG, adjustedVolumeG, relation to the previous window (first, early, in_window or late; the window is open from opensAt and closed from closesAt) and window with opensAt, closesAt and outcome (used: the next training fell in it; replaced: the next training came before it opened; missed: it closed with no training; open: open now; pending: opens later). The clock of the API gives now.',
      inputSchema: SimulateActivityWindowsQuerySchema,
      outputSchema: ActivityWindowSimulationSchema,
      annotations: { readOnlyHint: true },
    },
    (input) => runTool(() => simulateActivityWindows(db, input, now())),
  )

  server.registerTool(
    'list_activity_windows',
    {
      description:
        'Get the state of the activity window of each muscle group now, to know which groups are ready to train. Takes no parameter and only reads. Returns now (the clock of the API, a UTC instant in ISO 8601) and the 11 muscle groups in catalog order, each with muscleGroup (slug, name), state, lastTrainedAt, opensAt and closesAt. The window comes from the last training of the group, with the starting parameters: resting (before opensAt), open (from opensAt, inclusive, to closesAt, exclusive), cooling (from closesAt on, with no training of the group since) and none (the group was never trained; lastTrainedAt, opensAt and closesAt are null). A training of a group is a workout with a set of an exercise whose primary muscle is in the group. Read opensAt when resting, closesAt when open and closesAt as the start of the cooling when cooling. The same object that GET /api/windows returns.',
      inputSchema: z.object({}),
      outputSchema: ActivityWindowsSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => listActivityWindows(db, now())),
  )
}
