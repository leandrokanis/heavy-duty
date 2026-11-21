import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { createSignedInApp } from '../../test/session.js'

function createSeededApp(): { app: ReturnType<typeof createApp>; db: Database } {
  const db = createTestDatabase()
  runSeed(db)
  const app = createSignedInApp(createApp({ nodeEnv: 'test', databaseHealth: () => true, db }), db)
  return { app, db }
}

function postMuscle(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  return app.request('/api/muscles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function listMuscles(app: ReturnType<typeof createApp>): Promise<unknown> {
  const response = await app.request('/api/muscles')
  return response.json()
}

describe('Given a seeded database', () => {
  describe("When POST /api/muscles registers 'tríceps braquial' in group 'triceps'", () => {
    it("Then GET /api/muscles should list 'tríceps braquial' linked to the triceps group", async () => {
      const { app } = createSeededApp()

      await postMuscle(app, { name: 'tríceps braquial', muscleGroupSlug: 'triceps' })

      expect(await listMuscles(app)).toEqual({
        muscles: [
          {
            id: expect.any(String),
            slug: 'triceps-braquial',
            name: 'tríceps braquial',
            muscleGroup: { id: expect.any(String), slug: 'triceps', name: 'tríceps' },
          },
        ],
      })
    })
  })

  describe("When POST /api/muscles registers '  Tríceps Braquial  ' with spaces around the name", () => {
    it('Then should respond 201 with the trimmed name and the slug without accents', async () => {
      const { app } = createSeededApp()

      const response = await postMuscle(app, {
        name: '  Tríceps Braquial  ',
        muscleGroupSlug: 'triceps',
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 201,
        body: {
          id: expect.any(String),
          slug: 'triceps-braquial',
          name: 'Tríceps Braquial',
          muscleGroup: { id: expect.any(String), slug: 'triceps', name: 'tríceps' },
        },
      })
    })
  })

  describe('When two muscles are registered out of slug order', () => {
    it('Then GET /api/muscles should list them ordered by slug', async () => {
      const { app } = createSeededApp()

      await postMuscle(app, { name: 'tríceps braquial', muscleGroupSlug: 'triceps' })
      await postMuscle(app, { name: 'bíceps braquial', muscleGroupSlug: 'biceps' })
      const body = (await listMuscles(app)) as { muscles: { slug: string }[] }

      expect(body.muscles.map((muscle) => muscle.slug)).toEqual([
        'biceps-braquial',
        'triceps-braquial',
      ])
    })
  })

  describe.each([
    { label: 'has no muscleGroupSlug', body: { name: 'tríceps braquial' } },
    {
      label: 'has an empty muscleGroupSlug',
      body: { name: 'tríceps braquial', muscleGroupSlug: '' },
    },
  ])('When POST /api/muscles $label', ({ body }) => {
    it("Then should respond 400 with code muscle_group_required and message 'informe o grupo muscular', storing nothing", async () => {
      const { app } = createSeededApp()

      const response = await postMuscle(app, body)

      expect({
        status: response.status,
        body: await response.json(),
        list: await listMuscles(app),
      }).toEqual({
        status: 400,
        body: { code: 'muscle_group_required', message: 'informe o grupo muscular' },
        list: { muscles: [] },
      })
    })
  })

  describe("When POST /api/muscles uses group 'arms'", () => {
    it('Then should respond 422 with code muscle_group_not_found', async () => {
      const { app } = createSeededApp()

      const response = await postMuscle(app, { name: 'tríceps braquial', muscleGroupSlug: 'arms' })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 422,
        body: { code: 'muscle_group_not_found', message: 'grupo muscular não encontrado' },
      })
    })
  })

  describe.each([
    { label: 'has no name', body: { muscleGroupSlug: 'triceps' } },
    { label: 'has an empty name', body: { name: '', muscleGroupSlug: 'triceps' } },
    { label: 'has a blank name', body: { name: '   ', muscleGroupSlug: 'triceps' } },
    {
      label: 'has a name without letters or digits',
      body: { name: '!!!', muscleGroupSlug: 'triceps' },
    },
  ])('When POST /api/muscles $label', ({ body }) => {
    it('Then should respond 400 with code muscle_name_required', async () => {
      const { app } = createSeededApp()

      const response = await postMuscle(app, body)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'muscle_name_required', message: 'informe o nome do músculo' },
      })
    })
  })

  describe("and 'tríceps braquial' is registered", () => {
    describe.each([
      { label: 'with other case and spaces around', name: ' Tríceps Braquial ' },
      { label: 'without accents', name: 'triceps braquial' },
    ])('When POST /api/muscles registers the same muscle $label', ({ name }) => {
      it('Then should respond 409 with code muscle_already_exists, keeping one muscle', async () => {
        const { app } = createSeededApp()
        await postMuscle(app, { name: 'tríceps braquial', muscleGroupSlug: 'triceps' })

        const response = await postMuscle(app, { name, muscleGroupSlug: 'triceps' })
        const list = (await listMuscles(app)) as { muscles: unknown[] }

        expect({
          status: response.status,
          body: await response.json(),
          muscleCount: list.muscles.length,
        }).toEqual({
          status: 409,
          body: { code: 'muscle_already_exists', message: 'músculo já cadastrado' },
          muscleCount: 1,
        })
      })
    })
  })

  describe("and 'peitoral maior' is registered in 'chest'", () => {
    describe('When the seed runs again', () => {
      it('Then GET /api/muscles should still link it to the same chest group id', async () => {
        const { app, db } = createSeededApp()
        const created = await postMuscle(app, { name: 'peitoral maior', muscleGroupSlug: 'chest' })
        const chestIdBefore = ((await created.json()) as { muscleGroup: { id: string } })
          .muscleGroup.id

        runSeed(db)
        const list = (await listMuscles(app)) as { muscles: { muscleGroup: { id: string } }[] }

        expect(list.muscles.map((muscle) => muscle.muscleGroup.id)).toEqual([chestIdBefore])
      })
    })
  })
})
