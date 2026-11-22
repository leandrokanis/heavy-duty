import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getMuscleGroupVolume } from '../../modules/windows/volume.service.js'
import {
  MuscleGroupVolumeQuerySchema,
  MuscleGroupVolumeSchema,
} from '../../modules/windows/windows.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerWindowTools(server: McpServer, { db }: ToolDeps): void {
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
}
