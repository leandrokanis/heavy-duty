import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  activateProgram,
  addPlannedExercise,
  addProgramDay,
  createProgram,
  getProgram,
  listPrograms,
  removePlannedExercise,
  removeProgramDay,
  updatePlannedExercise,
  updateProgram,
  updateProgramDay,
} from '../../modules/programs/program.service.js'
import {
  AddPlannedExerciseInputSchema,
  AddProgramDayInputSchema,
  CreateProgramInputSchema,
  ProgramListSchema,
  ProgramSchema,
  UpdatePlannedExerciseInputSchema,
  UpdateProgramDayInputSchema,
  UpdateProgramInputSchema,
} from '../../modules/programs/programs.schemas.js'
import type { ToolDeps } from './index.js'
import { runTool } from './tool-result.js'

// Optional free strings, so a missing or empty value reaches the service and gets
// the same domain error as on HTTP (program_not_found, program_day_letter_required).
const programIdField = z.string().optional()
const letterField = z.string().optional()
const exerciseSlugField = z.string().optional()

const PROGRAM_ID_HINT = 'programId is the id returned by create_program or list_programs.'
const PLANNED_EXERCISE_HINT =
  'letter is the day letter, from A to Z; exerciseSlug is the slug of the exercise in that day, such as "supino-reto".'
const HISTORY_HINT = 'Recorded workouts keep their letter, exercises and values.'

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
    'update_program',
    {
      description: `Change the name or the goal ("strength", "hypertrophy" or "endurance") of a program. Only the fields sent change; an empty call returns the program unchanged. ${PROGRAM_ID_HINT}`,
      inputSchema: UpdateProgramInputSchema.extend({ programId: programIdField }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    ({ programId, ...input }) => runTool(() => updateProgram(db, programId ?? '', input)),
  )

  server.registerTool(
    'activate_program',
    {
      description: `Make a program the only active one, the program the next workouts follow. The previous active program stays stored but inactive; activating the active program changes nothing. ${PROGRAM_ID_HINT}`,
      inputSchema: z.object({ programId: programIdField }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    ({ programId }) => runTool(() => activateProgram(db, programId ?? '')),
  )

  server.registerTool(
    'update_program_day',
    {
      description: `Change the label of a program day, such as "Empurrar". Only the fields sent change; a null, empty or blank label clears it. The letter itself does not change. letter is the day letter, from A to Z. ${PROGRAM_ID_HINT}`,
      inputSchema: UpdateProgramDayInputSchema.extend({
        programId: programIdField,
        letter: letterField,
      }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    ({ programId, letter, ...input }) =>
      runTool(() => updateProgramDay(db, programId ?? '', letter ?? '', input)),
  )

  server.registerTool(
    'remove_program_day',
    {
      description: `Remove a day and its planned exercises from a program, to change how many days it has. The other days keep their order; adding the letter again creates an empty day at the end. ${HISTORY_HINT} letter is the day letter, from A to Z. ${PROGRAM_ID_HINT}`,
      inputSchema: z.object({ programId: programIdField, letter: letterField }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ programId, letter }) => runTool(() => removeProgramDay(db, programId ?? '', letter ?? '')),
  )

  server.registerTool(
    'update_planned_exercise',
    {
      description: `Change sets, target, load or rest of an exercise in a program day; the next workouts use the new values. Only the fields sent change. Give targetReps for a "reps" exercise or targetSeconds for a "time" exercise. sets and the target start at 1; loadG is the load in grams (42.5 kg = 42500, 0 for body weight) and restSeconds the rest in seconds; all are integers. ${HISTORY_HINT} ${PLANNED_EXERCISE_HINT} ${PROGRAM_ID_HINT}`,
      inputSchema: UpdatePlannedExerciseInputSchema.extend({
        programId: programIdField,
        letter: letterField,
        exerciseSlug: exerciseSlugField,
      }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    ({ programId, letter, exerciseSlug, ...input }) =>
      runTool(() =>
        updatePlannedExercise(db, programId ?? '', letter ?? '', exerciseSlug ?? '', input),
      ),
  )

  server.registerTool(
    'remove_planned_exercise',
    {
      description: `Remove an exercise from a program day. The other exercises keep their order; to swap an exercise, remove it and add the other with add_planned_exercise. ${HISTORY_HINT} ${PLANNED_EXERCISE_HINT} ${PROGRAM_ID_HINT}`,
      inputSchema: z.object({
        programId: programIdField,
        letter: letterField,
        exerciseSlug: exerciseSlugField,
      }),
      outputSchema: ProgramSchema,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ programId, letter, exerciseSlug }) =>
      runTool(() => removePlannedExercise(db, programId ?? '', letter ?? '', exerciseSlug ?? '')),
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
