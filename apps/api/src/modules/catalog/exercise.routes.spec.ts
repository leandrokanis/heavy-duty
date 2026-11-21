import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { createSignedInApp } from '../../test/session.js'

type App = ReturnType<typeof createApp>

type MuscleSeed = { name: string; muscleGroupSlug: string }

const PEITORAL_MAIOR: MuscleSeed = { name: 'peitoral maior', muscleGroupSlug: 'chest' }
const TRICEPS_BRAQUIAL: MuscleSeed = { name: 'tríceps braquial', muscleGroupSlug: 'triceps' }
const PEITORAL_MENOR: MuscleSeed = { name: 'peitoral menor', muscleGroupSlug: 'chest' }
const DELTOIDE_LATERAL: MuscleSeed = { name: 'deltoide lateral', muscleGroupSlug: 'shoulders' }
const RETO_ABDOMINAL: MuscleSeed = { name: 'reto abdominal', muscleGroupSlug: 'abs' }

async function createCatalog(muscles: readonly MuscleSeed[]): Promise<{ app: App; db: Database }> {
  const db = createTestDatabase()
  runSeed(db)
  const app = createSignedInApp(createApp({ nodeEnv: 'test', databaseHealth: () => true, db }), db)
  for (const muscle of muscles) {
    await postJson(app, '/api/muscles', muscle)
  }
  return { app, db }
}

async function createAppWithMuscles(muscles: readonly MuscleSeed[]): Promise<App> {
  return (await createCatalog(muscles)).app
}

function postJson(app: App, path: string, body: Record<string, unknown>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postExercise(app: App, body: Record<string, unknown>) {
  return postJson(app, '/api/exercises', body)
}

async function listExercises(app: App): Promise<unknown> {
  const response = await app.request('/api/exercises')
  return response.json()
}

const SUPINO_RETO_INPUT = {
  name: 'Supino reto',
  kind: 'reps',
  primaryMuscleSlugs: ['peitoral-maior'],
  secondaryMuscleSlugs: ['triceps-braquial'],
}

const CHEST = { id: expect.any(String), slug: 'chest', name: 'peito' }
const TRICEPS = { id: expect.any(String), slug: 'triceps', name: 'tríceps' }

const SUPINO_RETO = {
  id: expect.any(String),
  slug: 'supino-reto',
  name: 'Supino reto',
  kind: 'reps',
  muscles: [
    {
      id: expect.any(String),
      slug: 'peitoral-maior',
      name: 'peitoral maior',
      role: 'primary',
      muscleGroup: CHEST,
    },
    {
      id: expect.any(String),
      slug: 'triceps-braquial',
      name: 'tríceps braquial',
      role: 'secondary',
      muscleGroup: TRICEPS,
    },
  ],
  muscleGroups: [CHEST, TRICEPS],
}

describe("Given 'peitoral maior' in chest and 'tríceps braquial' in triceps", () => {
  describe("When POST /api/exercises registers 'Supino reto' of kind reps with peitoral-maior as primary and triceps-braquial as secondary", () => {
    it('Then GET /api/exercises should list it with both muscles and their roles, linked to the groups peito and tríceps', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR, TRICEPS_BRAQUIAL])

      await postExercise(app, SUPINO_RETO_INPUT)

      expect(await listExercises(app)).toEqual({ exercises: [SUPINO_RETO] })
    })
  })

  describe("When POST /api/exercises registers '  Supino reto  ' with spaces around the name", () => {
    it('Then should respond 201 with the trimmed name, the slug and the muscles with roles and groups', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR, TRICEPS_BRAQUIAL])

      const response = await postExercise(app, { ...SUPINO_RETO_INPUT, name: '  Supino reto  ' })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 201,
        body: SUPINO_RETO,
      })
    })
  })

  describe('When two exercises are registered out of slug order', () => {
    it('Then GET /api/exercises should list them ordered by slug', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR, TRICEPS_BRAQUIAL])

      await postExercise(app, SUPINO_RETO_INPUT)
      await postExercise(app, { ...SUPINO_RETO_INPUT, name: 'Crucifixo' })
      const body = (await listExercises(app)) as { exercises: { slug: string }[] }

      expect(body.exercises.map((exercise) => exercise.slug)).toEqual(['crucifixo', 'supino-reto'])
    })
  })
})

describe("Given 'reto abdominal' in abs", () => {
  describe("When POST /api/exercises registers 'Prancha' of kind time with reto-abdominal as primary and no secondary muscles", () => {
    it('Then should respond 201 with kind time linked only to the group abdômen', async () => {
      const app = await createAppWithMuscles([RETO_ABDOMINAL])

      const response = await postExercise(app, {
        name: 'Prancha',
        kind: 'time',
        primaryMuscleSlugs: ['reto-abdominal'],
      })

      const abs = { id: expect.any(String), slug: 'abs', name: 'abdômen' }
      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 201,
        body: {
          id: expect.any(String),
          slug: 'prancha',
          name: 'Prancha',
          kind: 'time',
          muscles: [
            {
              id: expect.any(String),
              slug: 'reto-abdominal',
              name: 'reto abdominal',
              role: 'primary',
              muscleGroup: abs,
            },
          ],
          muscleGroups: [abs],
        },
      })
    })
  })
})

type ExerciseBody = {
  muscles: { slug: string; role: string }[]
  muscleGroups: { slug: string }[]
}

function summarize(exercise: ExerciseBody) {
  return {
    muscles: exercise.muscles.map((muscle) => `${muscle.role}:${muscle.slug}`),
    muscleGroups: exercise.muscleGroups.map((group) => group.slug),
  }
}

describe('Given two chest muscles and one triceps muscle', () => {
  describe.each([
    {
      label: 'has both chest muscles and the triceps muscle as primary, triceps first',
      primaryMuscleSlugs: ['triceps-braquial', 'peitoral-menor', 'peitoral-maior'],
      secondaryMuscleSlugs: [],
      muscles: ['primary:peitoral-maior', 'primary:peitoral-menor', 'primary:triceps-braquial'],
    },
    {
      label: 'splits a chest muscle and the triceps muscle between roles, triceps first',
      primaryMuscleSlugs: ['triceps-braquial', 'peitoral-menor'],
      secondaryMuscleSlugs: ['peitoral-maior'],
      muscles: ['primary:peitoral-menor', 'primary:triceps-braquial', 'secondary:peitoral-maior'],
    },
  ])('When an exercise $label', ({ primaryMuscleSlugs, secondaryMuscleSlugs, muscles }) => {
    it('Then muscleGroups should list peito once, before tríceps, with primary muscles before secondary ones, by slug', async () => {
      const app = await createAppWithMuscles([TRICEPS_BRAQUIAL, PEITORAL_MENOR, PEITORAL_MAIOR])

      const response = await postExercise(app, {
        name: 'Mergulho no banco',
        kind: 'reps',
        primaryMuscleSlugs,
        secondaryMuscleSlugs,
      })
      const list = (await listExercises(app)) as { exercises: ExerciseBody[] }
      const expected = { muscles, muscleGroups: ['chest', 'triceps'] }

      expect({
        created: summarize((await response.json()) as ExerciseBody),
        listed: summarize(list.exercises[0] as ExerciseBody),
      }).toEqual({ created: expected, listed: expected })
    })
  })
})

describe('Given a seeded catalog with muscles', () => {
  describe.each([
    { label: 'has no primaryMuscleSlugs', primary: {} },
    { label: 'has an empty primaryMuscleSlugs', primary: { primaryMuscleSlugs: [] } },
  ])('When POST /api/exercises $label', ({ primary }) => {
    it("Then should respond 400 with code exercise_muscle_required and message 'informe ao menos um músculo', storing nothing", async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR])

      const response = await postExercise(app, { name: 'Supino reto', kind: 'reps', ...primary })

      expect({
        status: response.status,
        body: await response.json(),
        list: await listExercises(app),
      }).toEqual({
        status: 400,
        body: { code: 'exercise_muscle_required', message: 'informe ao menos um músculo' },
        list: { exercises: [] },
      })
    })
  })
})

describe("Given 'tríceps braquial' is registered", () => {
  describe("When POST /api/exercises registers 'Mergulho' with triceps-braquial only as secondary", () => {
    it('Then should respond 400 with code exercise_muscle_required', async () => {
      const app = await createAppWithMuscles([TRICEPS_BRAQUIAL])

      const response = await postExercise(app, {
        name: 'Mergulho',
        kind: 'reps',
        secondaryMuscleSlugs: ['triceps-braquial'],
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'exercise_muscle_required', message: 'informe ao menos um músculo' },
      })
    })
  })
})

describe("Given 'peitoral maior' is registered", () => {
  describe.each([
    { label: 'has no name', name: {} },
    { label: 'has an empty name', name: { name: '' } },
    { label: 'has a blank name', name: { name: '   ' } },
    { label: 'has a name without letters or digits', name: { name: '!!!' } },
  ])('When POST /api/exercises $label', ({ name }) => {
    it('Then should respond 400 with code exercise_name_required', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR])

      const response = await postExercise(app, {
        kind: 'reps',
        primaryMuscleSlugs: ['peitoral-maior'],
        ...name,
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'exercise_name_required', message: 'informe o nome do exercício' },
      })
    })
  })

  describe('When POST /api/exercises has no kind', () => {
    it('Then should respond 400 with code exercise_kind_required', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR])

      const response = await postExercise(app, {
        name: 'Supino reto',
        primaryMuscleSlugs: ['peitoral-maior'],
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'exercise_kind_required', message: 'informe o tipo do exercício' },
      })
    })
  })

  describe("When kind is 'weight'", () => {
    it('Then should respond 400 with code exercise_kind_invalid', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR])

      const response = await postExercise(app, {
        name: 'Supino reto',
        kind: 'weight',
        primaryMuscleSlugs: ['peitoral-maior'],
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'exercise_kind_invalid', message: 'tipo de exercício inválido' },
      })
    })
  })
})

describe("Given 'peitoral maior' and 'tríceps braquial' are registered", () => {
  describe.each([
    {
      label: 'peitoral-maior is twice in primaryMuscleSlugs',
      muscles: { primaryMuscleSlugs: ['peitoral-maior', 'peitoral-maior'] },
    },
    {
      label: 'peitoral-maior is both primary and secondary',
      muscles: {
        primaryMuscleSlugs: ['peitoral-maior'],
        secondaryMuscleSlugs: ['triceps-braquial', 'peitoral-maior'],
      },
    },
  ])('When $label', ({ muscles }) => {
    it('Then should respond 400 with code exercise_muscle_duplicated and GET /api/exercises should stay empty', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR, TRICEPS_BRAQUIAL])

      const response = await postExercise(app, { name: 'Supino reto', kind: 'reps', ...muscles })

      expect({
        status: response.status,
        body: await response.json(),
        list: await listExercises(app),
      }).toEqual({
        status: 400,
        body: { code: 'exercise_muscle_duplicated', message: 'músculo repetido no exercício' },
        list: { exercises: [] },
      })
    })
  })
})

describe("Given only 'peitoral maior' is registered", () => {
  describe('When a primary muscle slug is not in the catalog', () => {
    it('Then should respond 422 with code muscle_not_found and GET /api/exercises should stay empty', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR])

      const response = await postExercise(app, {
        name: 'Supino reto',
        kind: 'reps',
        primaryMuscleSlugs: ['peitoral-maior', 'deltoide-anterior'],
      })

      expect({
        status: response.status,
        body: await response.json(),
        list: await listExercises(app),
      }).toEqual({
        status: 422,
        body: { code: 'muscle_not_found', message: 'músculo não encontrado' },
        list: { exercises: [] },
      })
    })
  })
})

describe.each([
  {
    registered: 'Supino reto',
    muscle: 'peitoral-maior',
    label: "' SUPINO RETO ', with other case and spaces around",
    name: ' SUPINO RETO ',
  },
  {
    registered: 'Elevação lateral',
    muscle: 'deltoide-lateral',
    label: "'elevacao lateral', without accents",
    name: 'elevacao lateral',
  },
])("Given '$registered' is registered", ({ registered, muscle, label, name }) => {
  describe(`When POST /api/exercises registers ${label}`, () => {
    it('Then should respond 409 with code exercise_already_exists, keeping one exercise', async () => {
      const app = await createAppWithMuscles([PEITORAL_MAIOR, DELTOIDE_LATERAL])
      const exercise = { kind: 'reps', primaryMuscleSlugs: [muscle] }
      await postExercise(app, { ...exercise, name: registered })

      const response = await postExercise(app, { ...exercise, name })
      const list = (await listExercises(app)) as { exercises: unknown[] }

      expect({
        status: response.status,
        body: await response.json(),
        exerciseCount: list.exercises.length,
      }).toEqual({
        status: 409,
        body: { code: 'exercise_already_exists', message: 'exercício já cadastrado' },
        exerciseCount: 1,
      })
    })
  })
})

describe('Given an active exercise and an exercise with archived_at set directly in the database', () => {
  describe('When GET /api/exercises is requested', () => {
    it('Then should list only the active one', async () => {
      const { app, db } = await createCatalog([PEITORAL_MAIOR])
      const exercise = { kind: 'reps', primaryMuscleSlugs: ['peitoral-maior'] }
      await postExercise(app, { ...exercise, name: 'Crucifixo' })
      await postExercise(app, { ...exercise, name: 'Supino reto' })
      db.$client
        .prepare("UPDATE exercises SET archived_at = '2026-11-21T10:00:00.000Z' WHERE slug = ?")
        .run('crucifixo')

      const body = (await listExercises(app)) as { exercises: { slug: string }[] }

      expect(body.exercises.map((listed) => listed.slug)).toEqual(['supino-reto'])
    })
  })
})
