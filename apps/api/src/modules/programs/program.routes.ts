import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import type { Database } from '../../db/connection.js'
import { createRouter, ErrorSchema, UNAUTHENTICATED_RESPONSE } from '../../http/errors.js'
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
} from './program.service.js'
import {
  AddPlannedExerciseInputSchema,
  AddProgramDayInputSchema,
  CreateProgramInputSchema,
  PlannedExerciseParamsSchema,
  ProgramDayParamsSchema,
  ProgramIdParamsSchema,
  ProgramListSchema,
  ProgramSchema,
  UpdatePlannedExerciseInputSchema,
  UpdateProgramDayInputSchema,
  UpdateProgramInputSchema,
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

const dayNotFound = {
  description:
    'No program with this id (program_not_found) or no such letter in the program (program_day_not_found)',
  content: errorContent,
}
const plannedExerciseNotFound = {
  description:
    'No program with this id (program_not_found), no such letter in the program (program_day_not_found) or the exercise is not in the day (planned_exercise_not_found)',
  content: errorContent,
}
const letterInvalid = {
  description: 'Letter other than A to Z (program_day_letter_invalid)',
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

const updateProgramRoute = createRoute({
  method: 'patch',
  path: '/api/programs/{programId}',
  tags: ['programs'],
  summary: 'Change the name or the goal of a program; only the fields sent change',
  request: {
    params: ProgramIdParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: UpdateProgramInputSchema } },
    },
  },
  responses: {
    200: { description: 'The changed program', content: programContent },
    400: {
      description:
        'Null, empty or blank name (program_name_required), null or empty goal (program_goal_required) or goal other than strength, hypertrophy or endurance (program_goal_invalid)',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    404: programNotFound,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const activateProgramRoute = createRoute({
  method: 'post',
  path: '/api/programs/{programId}/activate',
  tags: ['programs'],
  summary:
    'Make a program the only active one; the previous active program stays stored but inactive',
  request: { params: ProgramIdParamsSchema },
  responses: {
    200: { description: 'The program, now active', content: programContent },
    401: UNAUTHENTICATED_RESPONSE,
    404: programNotFound,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const updateProgramDayRoute = createRoute({
  method: 'patch',
  path: '/api/programs/{programId}/days/{letter}',
  tags: ['programs'],
  summary: 'Change the label of a day; null, empty or blank clears it and the letter stays',
  request: {
    params: ProgramDayParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: UpdateProgramDayInputSchema } },
    },
  },
  responses: {
    200: { description: 'The program with the changed day', content: programContent },
    400: letterInvalid,
    401: UNAUTHENTICATED_RESPONSE,
    404: dayNotFound,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const removeProgramDayRoute = createRoute({
  method: 'delete',
  path: '/api/programs/{programId}/days/{letter}',
  tags: ['programs'],
  summary:
    'Remove a day with its planned exercises; the other days keep their order and recorded workouts keep their letter and sets',
  request: { params: ProgramDayParamsSchema },
  responses: {
    200: { description: 'The program without the day', content: programContent },
    400: letterInvalid,
    401: UNAUTHENTICATED_RESPONSE,
    404: dayNotFound,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const updatePlannedExerciseRoute = createRoute({
  method: 'patch',
  path: '/api/programs/{programId}/days/{letter}/exercises/{exerciseSlug}',
  tags: ['programs'],
  summary:
    'Change sets, target, load in grams or rest in seconds of a planned exercise; only the fields sent change and recorded workouts keep their values',
  request: {
    params: PlannedExerciseParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: UpdatePlannedExerciseInputSchema } },
    },
  },
  responses: {
    200: { description: 'The program with the changed planned exercise', content: programContent },
    400: {
      description:
        'Invalid letter (program_day_letter_invalid), sets not an integer from 1 (planned_exercise_sets_invalid), load not an integer from 0 (planned_exercise_load_invalid), rest not an integer from 0 (planned_exercise_rest_invalid), reps on a time exercise (planned_exercise_target_time), seconds on a reps exercise (planned_exercise_target_reps) or target not an integer from 1 (planned_exercise_target_invalid); null counts as invalid',
      content: errorContent,
    },
    401: UNAUTHENTICATED_RESPONSE,
    404: plannedExerciseNotFound,
    500: { description: 'Unexpected error', content: errorContent },
  },
})

const removePlannedExerciseRoute = createRoute({
  method: 'delete',
  path: '/api/programs/{programId}/days/{letter}/exercises/{exerciseSlug}',
  tags: ['programs'],
  summary:
    'Remove a planned exercise from a day; the other exercises keep their order and recorded workouts keep their sets',
  request: { params: PlannedExerciseParamsSchema },
  responses: {
    200: { description: 'The program without the planned exercise', content: programContent },
    400: letterInvalid,
    401: UNAUTHENTICATED_RESPONSE,
    404: plannedExerciseNotFound,
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

  routes.openapi(updateProgramRoute, (c) =>
    c.json(updateProgram(db, c.req.valid('param').programId, c.req.valid('json')), 200),
  )

  routes.openapi(activateProgramRoute, (c) =>
    c.json(activateProgram(db, c.req.valid('param').programId), 200),
  )

  routes.openapi(updateProgramDayRoute, (c) => {
    const { programId, letter } = c.req.valid('param')
    return c.json(updateProgramDay(db, programId, letter, c.req.valid('json')), 200)
  })

  routes.openapi(removeProgramDayRoute, (c) => {
    const { programId, letter } = c.req.valid('param')
    return c.json(removeProgramDay(db, programId, letter), 200)
  })

  routes.openapi(updatePlannedExerciseRoute, (c) => {
    const { programId, letter, exerciseSlug } = c.req.valid('param')
    return c.json(
      updatePlannedExercise(db, programId, letter, exerciseSlug, c.req.valid('json')),
      200,
    )
  })

  routes.openapi(removePlannedExerciseRoute, (c) => {
    const { programId, letter, exerciseSlug } = c.req.valid('param')
    return c.json(removePlannedExercise(db, programId, letter, exerciseSlug), 200)
  })

  return routes
}
