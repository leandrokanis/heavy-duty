import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  AddMuscleInputSchema,
  MuscleGroupListSchema,
  MuscleListSchema,
  MuscleSchema,
} from '../../modules/catalog/catalog.schemas.js'
import { addMuscle, listMuscles } from '../../modules/catalog/muscle.service.js'
import { listMuscleGroups } from '../../modules/catalog/muscle-group.service.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

export function registerCatalogTools(server: McpServer, { db }: ToolDeps): void {
  server.registerTool(
    'list_muscle_groups',
    {
      description: 'List the muscle groups of the catalog, in catalog order.',
      inputSchema: z.object({}),
      outputSchema: MuscleGroupListSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => listMuscleGroups(db)),
  )

  server.registerTool(
    'list_muscles',
    {
      description: 'List the registered muscles, each with its muscle group, ordered by slug.',
      inputSchema: z.object({}),
      outputSchema: MuscleListSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => listMuscles(db)),
  )

  server.registerTool(
    'add_muscle',
    {
      description:
        'Register a muscle in a muscle group. muscleGroupSlug is a slug from list_muscle_groups, such as "triceps".',
      inputSchema: AddMuscleInputSchema,
      outputSchema: MuscleSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => runTool(() => addMuscle(db, input)),
  )
}
