import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
import {
  addPlannedExercise,
  addProgramDay,
  createProgram,
  getProgram,
  listPrograms,
} from './program.service.js'
import {
  AddPlannedExerciseInputSchema,
  AddProgramDayInputSchema,
  CreateProgramInputSchema,
  ProgramDayParamsSchema,
  ProgramIdParamsSchema,
  ProgramListSchema,
  ProgramSchema,
} from './programs.schemas.js'

export type ProgramRoutesDeps = {
  db: Database
  now: () => Date
}

const errorContent = { 'application/json': { schema: ErrorSchema } }
const programContent = { 'application/json': { schema: ProgramSchema } }
const programNotFound = {
  description: 'No program with this id (program_not_found)',
  content: errorContent,
}

const createProgramRoute = createRoute({
  method: 'post',
  path: '/api/programs',
  tags: ['programs'],
  summary: 'Create a program with a name and a goal; it becomes the only active program',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CreateProgramInputSchema } },
    },
  },
  responses: {
    201: { description: 'The created program, active and without days', content: programContent },
    400: {
      description:
        'Missing or blank name (program_name_required), missing goal (program_goal_required) or goal other than strength, hypertrophy or endurance (program_goal_invalid)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const listProgramsRoute = createRoute({
  method: 'get',
  path: '/api/programs',
  tags: ['programs'],
  summary: 'List the programs, the active one first and the others from newest to oldest',
  responses: {
    200: {
      description: 'The programs with their days and planned exercises',
      content: { 'application/json': { schema: ProgramListSchema } },
    },
    401: UNAUTHENTICATED_RESPONSE,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const getProgramRoute = createRoute({
  method: 'get',
  path: '/api/programs/{programId}',
  tags: ['programs'],
  summary: 'Show a program with its days and planned exercises in plan order',
  request: { params: ProgramIdParamsSchema },
  responses: {
    200: { description: 'The program', content: programContent },
    401: UNAUTHENTICATED_RESPONSE,
    404: programNotFound,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const addProgramDayRoute = createRoute({
  method: 'post',
  path: '/api/programs/{programId}/days',
  tags: ['programs'],
  summary: 'Add a day (letter A to Z, optional label) at the end of the program plan',
  request: {
    params: ProgramIdParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: AddProgramDayInputSchema } },
    },
  },
  responses: {
    201: { description: 'The program with the new day last', content: programContent },
    400: {
      description:
        'Missing letter (program_day_letter_required) or letter other than A to Z (program_day_letter_invalid)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    404: programNotFound,
    409: {
      description: 'The letter already exists in the program (program_day_letter_duplicated)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const addPlannedExerciseRoute = createRoute({
  method: 'post',
  path: '/api/programs/{programId}/days/{letter}/exercises',
  tags: ['programs'],
  summary: 'Add a catalog exercise with sets, target, load in grams and rest in seconds to a day',
  request: {
    params: ProgramDayParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: AddPlannedExerciseInputSchema } },
    },
  },
  responses: {
    201: {
      description: 'The program with the new planned exercise last in the day',
      content: programContent,
    },
    400: {
      description:
        'Invalid letter (program_day_letter_invalid), missing exercise (planned_exercise_exercise_required), sets not an integer from 1 (planned_exercise_sets_invalid), missing or invalid load (planned_exercise_load_required, planned_exercise_load_invalid), missing or invalid rest (planned_exercise_rest_required, planned_exercise_rest_invalid), reps on a time exercise (planned_exercise_target_time), seconds on a reps exercise (planned_exercise_target_reps), missing target (planned_exercise_target_required) or target not an integer from 1 (planned_exercise_target_invalid)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    404: {
      description:
        'No program with this id (program_not_found) or no such letter in the program (program_day_not_found)',
      content: errorContent,
    },
    409: {
      description: 'The exercise is already in this day (planned_exercise_duplicated)',
      content: errorContent,
    },
    422: {
      description: 'The exercise is not in the catalog or is archived (exercise_not_found)',
      content: errorContent,
    },
    500: { description: 'Unexpected error', content: errorContent },
  },
})

export function createProgramRoutes({ db, now }: ProgramRoutesDeps): OpenAPIHono {
  const routes = createRouter()

  routes.openapi(createProgramRoute, (c) =>
    c.json(createProgram(db, c.req.valid('json'), now()), 201),
  )
  routes.openapi(listProgramsRoute, (c) => c.json(listPrograms(db), 200))
  routes.openapi(getProgramRoute, (c) =>
    c.json(getProgram(db, c.req.valid('param').programId), 200),
  )

  routes.openapi(addProgramDayRoute, (c) =>
    c.json(addProgramDay(db, c.req.valid('param').programId, c.req.valid('json'), now()), 201),
  )

  routes.openapi(addPlannedExerciseRoute, (c) => {
    const { programId, letter } = c.req.valid('param')
    return c.json(addPlannedExercise(db, programId, letter, c.req.valid('json'), now()), 201)
  })

  return routes
}
