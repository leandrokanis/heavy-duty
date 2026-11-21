import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  addPlannedExercise,
  addProgramDay,
  createProgram,
  getProgram,
  listPrograms,
} from '../../modules/programs/program.service.js'
import {
  AddPlannedExerciseInputSchema,
  AddProgramDayInputSchema,
  CreateProgramInputSchema,
  ProgramListSchema,
  ProgramSchema,
} from '../../modules/programs/programs.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

// Optional free strings, so a missing or empty value reaches the service and gets
// the same domain error as on HTTP (program_not_found, program_day_letter_required).
const programIdField = z.string().optional()
const letterField = z.string().optional()

const PROGRAM_ID_HINT = 'programId is the id returned by create_program or list_programs.'

export function registerProgramTools(server: McpServer, { db, now }: ToolDeps): void {
  server.registerTool(
    'create_program',
    {
      description:
        'Create a training program with a name and a goal ("strength", "hypertrophy" or "endurance"). The new program becomes the only active one; the previous active program stays stored but inactive. Returns the program with its id.',
      inputSchema: CreateProgramInputSchema,
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => runTool(() => createProgram(db, input, now())),
  )

  server.registerTool(
    'add_program_day',
    {
      description: `Add a day to a program, at the end of the plan order. letter is one letter from A to Z (lower case is stored in upper case) and must not repeat in the program; label is an optional free name, such as "Superior". ${PROGRAM_ID_HINT}`,
      inputSchema: AddProgramDayInputSchema.extend({ programId: programIdField }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    ({ programId, ...input }) => runTool(() => addProgramDay(db, programId ?? '', input, now())),
  )

  server.registerTool(
    'add_planned_exercise',
    {
      description: `Add a catalog exercise to a program day, at the end of the day. exerciseSlug is a slug from list_exercises, such as "supino-reto". Give targetReps for a "reps" exercise or targetSeconds for a "time" exercise, never both. sets and targetReps start at 1; loadG is the load in grams (40 kg = 40000, 0 for body weight) and restSeconds the rest between sets in seconds; all are integers. letter is the day letter, from A to Z. ${PROGRAM_ID_HINT}`,
      inputSchema: AddPlannedExerciseInputSchema.extend({
        programId: programIdField,
        letter: letterField,
      }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    ({ programId, letter, ...input }) =>
      runTool(() => addPlannedExercise(db, programId ?? '', letter ?? '', input, now())),
  )

  server.registerTool(
    'get_program',
    {
      description: `Show a program with its days in plan order and each day's planned exercises in day order, with load in grams and rest in seconds. ${PROGRAM_ID_HINT}`,
      inputSchema: z.object({ programId: programIdField }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: true },
    },
    ({ programId }) => runTool(() => getProgram(db, programId ?? '')),
  )

  server.registerTool(
    'list_programs',
    {
      description:
        'List the programs with their days and planned exercises, the active program first and the others from newest to oldest.',
      inputSchema: z.object({}),
      outputSchema: ProgramListSchema,
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => listPrograms(db)),
  )
}
