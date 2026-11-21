import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { runSeed } from './db/seed.js'
import { createTestDatabase } from './test/database.js'
import { createSessionCookie, createSignedInApp } from './test/session.js'

describe('Given an app in production', () => {
  const app = createApp({ nodeEnv: 'production', databaseHealth: () => true })

  describe('When /api/docs, /api/openapi.json and /mcp are requested', () => {
    it('Then should respond 404 to each', async () => {
      const requests = [
        app.request('/api/docs'),
        app.request('/api/openapi.json'),
        app.request('/mcp', { method: 'POST' }),
      ]
      const statuses = (await Promise.all(requests)).map((response) => response.status)

      expect(statuses).toEqual([404, 404, 404])
    })
  })
})

const UNAUTHENTICATED_BODY = {
  code: 'unauthenticated',
  message: 'Entre com a sua chave de acesso.',
}

function protectedRequests(app: ReturnType<typeof createApp>, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  const get = (path: string) => app.request(path, { headers })
  const post = (path: string, body: Record<string, unknown>) =>
    app.request(path, { method: 'POST', headers, body: JSON.stringify(body) })
  return [
    get('/api/muscle-groups'),
    get('/api/muscles'),
    post('/api/muscles', { name: 'peitoral maior', muscleGroupSlug: 'chest' }),
    get('/api/exercises'),
    post('/api/exercises', { name: 'Supino reto', kind: 'reps', primaryMuscleSlugs: [] }),
    get('/api/system/status'),
    get('/api/openapi.json'),
    get('/api/docs'),
  ]
}

describe('Given an app in production with a database', () => {
  const db = createTestDatabase()
  runSeed(db)
  const app = createApp({ nodeEnv: 'production', databaseHealth: () => true, db })

  describe('When the catalog routes, /api/system/status, /api/openapi.json and /api/docs are requested without a session cookie', () => {
    it('Then should respond 401 with code unauthenticated and the sign-in message and no other field', async () => {
      const responses = await Promise.all(protectedRequests(app))
      const results = await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          body: await response.json(),
        })),
      )

      expect(results).toEqual(
        Array.from({ length: 8 }, () => ({ status: 401, body: UNAUTHENTICATED_BODY })),
      )
    })
  })

  describe('When the same routes are requested with a valid session cookie', () => {
    it('Then should respond 200, with 201 and 400 for the posts', async () => {
      const responses = await Promise.all(protectedRequests(app, createSessionCookie(db)))

      expect(responses.map((response) => response.status)).toEqual([
        200, 200, 201, 200, 400, 200, 200, 200,
      ])
    })
  })

  describe('When a forged session cookie is sent', () => {
    it('Then should respond 401 with code unauthenticated', async () => {
      const response = await app.request('/api/muscle-groups', {
        headers: { cookie: 'hd_session=forged-token' },
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 401,
        body: UNAUTHENTICATED_BODY,
      })
    })
  })

  describe('When /mcp is requested', () => {
    it('Then should respond 404', async () => {
      const response = await app.request('/mcp', { method: 'POST' })

      expect(response.status).toBe(404)
    })
  })

  describe('When GET /api/health is requested without a session cookie', () => {
    it('Then should respond 200', async () => {
      const response = await app.request('/api/health')

      expect(response.status).toBe(200)
    })
  })
})

describe('Given an app in production with a database and no session cookie', () => {
  const db = createTestDatabase()
  runSeed(db)
  const app = createApp({ nodeEnv: 'production', databaseHealth: () => true, db })

  describe('When the five program routes are requested', () => {
    it('Then should respond 401 with code unauthenticated and no training data', async () => {
      const post = (path: string, body: Record<string, unknown>) =>
        app.request(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      const programId = '0193a1b2-0000-7000-8000-000000000301'
      const responses = await Promise.all([
        post('/api/programs', { name: 'Programa 1', goal: 'hypertrophy' }),
        app.request('/api/programs'),
        app.request(`/api/programs/${programId}`),
        post(`/api/programs/${programId}/days`, { letter: 'A' }),
        post(`/api/programs/${programId}/days/A/exercises`, { exerciseSlug: 'supino-reto' }),
      ])
      const results = await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          body: await response.json(),
        })),
      )

      expect(results).toEqual(
        Array.from({ length: 5 }, () => ({ status: 401, body: UNAUTHENTICATED_BODY })),
      )
    })
  })
})

describe('Given an app in development with a database and no session cookie', () => {
  const app = createApp({
    nodeEnv: 'development',
    databaseHealth: () => true,
    db: createTestDatabase(),
  })

  describe('When GET /api/muscle-groups, GET /api/auth/session and an unknown /api path are requested', () => {
    it('Then should respond 401 with code unauthenticated to each', async () => {
      const responses = await Promise.all([
        app.request('/api/muscle-groups'),
        app.request('/api/auth/session'),
        app.request('/api/unknown'),
      ])
      const results = await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          body: await response.json(),
        })),
      )

      expect(results).toEqual(
        Array.from({ length: 3 }, () => ({ status: 401, body: UNAUTHENTICATED_BODY })),
      )
    })
  })
})

describe('Given a session created at T0 in an app whose clock is set by the test', () => {
  const T0 = new Date('2026-11-21T12:00:00.000Z')

  function appAt(db: ReturnType<typeof createTestDatabase>, now: Date) {
    return createApp({ nodeEnv: 'test', databaseHealth: () => true, db, now: () => now })
  }

  describe('When a data route is requested at T0 + 25 hours', () => {
    it('Then should resend the hd_session cookie with a Max-Age of 30 days', async () => {
      const db = createTestDatabase()
      const cookie = createSessionCookie(db, T0)
      const app = appAt(db, new Date(T0.getTime() + 25 * 60 * 60 * 1000))

      const response = await app.request('/api/muscle-groups', { headers: { cookie } })
      const setCookie = response.headers.get('set-cookie') ?? ''

      expect({
        status: response.status,
        resendsSameToken: setCookie.startsWith(`${cookie};`),
        maxAge: /Max-Age=2592000/.test(setCookie),
      }).toEqual({ status: 200, resendsSameToken: true, maxAge: true })
    })
  })

  describe('When a data route is requested at T0 + 12 hours', () => {
    it('Then should not send a Set-Cookie header', async () => {
      const db = createTestDatabase()
      const cookie = createSessionCookie(db, T0)
      const app = appAt(db, new Date(T0.getTime() + 12 * 60 * 60 * 1000))

      const response = await app.request('/api/muscle-groups', { headers: { cookie } })

      expect({ status: response.status, setCookie: response.headers.get('set-cookie') }).toEqual({
        status: 200,
        setCookie: null,
      })
    })
  })

  describe('When a data route is requested at T0 + 30 days + 1 ms', () => {
    it('Then should respond 401 with code unauthenticated', async () => {
      const db = createTestDatabase()
      const cookie = createSessionCookie(db, T0)
      const app = appAt(db, new Date(T0.getTime() + 30 * 24 * 60 * 60 * 1000 + 1))

      const response = await app.request('/api/muscle-groups', { headers: { cookie } })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 401,
        body: UNAUTHENTICATED_BODY,
      })
    })
  })
})

describe('Given an app in development with a database', () => {
  const db = createTestDatabase()
  const app = createSignedInApp(
    createApp({ nodeEnv: 'development', databaseHealth: () => true, db }),
    db,
  )

  describe('When the OpenAPI document is generated', () => {
    it('Then should declare the catalog routes, with GET /api/exercises answering 200, 401 and 500 and POST /api/exercises answering 201, 400, 401, 409, 422 and 500', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as {
        paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
      }
      const responseCodes = (path: string, method: string) =>
        Object.keys(document.paths[path]?.[method]?.responses ?? {}).sort()

      expect({
        listMuscleGroups: responseCodes('/api/muscle-groups', 'get'),
        listMuscles: responseCodes('/api/muscles', 'get'),
        addMuscle: responseCodes('/api/muscles', 'post'),
        listExercises: responseCodes('/api/exercises', 'get'),
        addExercise: responseCodes('/api/exercises', 'post'),
      }).toEqual({
        listMuscleGroups: ['200', '401', '500'],
        listMuscles: ['200', '401', '500'],
        addMuscle: ['201', '400', '401', '409', '422', '500'],
        listExercises: ['200', '401', '500'],
        addExercise: ['201', '400', '401', '409', '422', '500'],
      })
    })
  })

  describe('When the OpenAPI document is generated for the system status', () => {
    it('Then should declare GET /api/system/status with 200, 401 and 500', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as {
        paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
      }

      expect(
        Object.keys(document.paths['/api/system/status']?.get?.responses ?? {}).sort(),
      ).toEqual(['200', '401', '500'])
    })
  })

  describe('When the OpenAPI document is generated for the program routes', () => {
    it('Then should declare the five program routes under the global session cookie security, with their response statuses', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as {
        paths: Record<
          string,
          Record<string, { security?: unknown; responses: Record<string, unknown> }>
        >
      }
      const describeRoute = (path: string, method: string) => ({
        security: document.paths[path]?.[method]?.security,
        statuses: Object.keys(document.paths[path]?.[method]?.responses ?? {}).sort(),
      })

      expect({
        createProgram: describeRoute('/api/programs', 'post'),
        listPrograms: describeRoute('/api/programs', 'get'),
        getProgram: describeRoute('/api/programs/{programId}', 'get'),
        addProgramDay: describeRoute('/api/programs/{programId}/days', 'post'),
        addPlannedExercise: describeRoute(
          '/api/programs/{programId}/days/{letter}/exercises',
          'post',
        ),
      }).toEqual({
        createProgram: { security: undefined, statuses: ['201', '400', '401', '500'] },
        listPrograms: { security: undefined, statuses: ['200', '401', '500'] },
        getProgram: { security: undefined, statuses: ['200', '401', '404', '500'] },
        addProgramDay: {
          security: undefined,
          statuses: ['201', '400', '401', '404', '409', '500'],
        },
        addPlannedExercise: {
          security: undefined,
          statuses: ['201', '400', '401', '404', '409', '422', '500'],
        },
      })
    })
  })

  describe('When the OpenAPI document is requested with a session cookie', () => {
    it('Then should declare the sessionCookie scheme in the hd_session cookie, require it globally, and declare an empty security on the health and the four ceremony routes', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as {
        security?: unknown
        components?: { securitySchemes?: Record<string, unknown> }
        paths: Record<string, Record<string, { security?: unknown }>>
      }
      const securityOf = (path: string, method: string) => document.paths[path]?.[method]?.security

      expect({
        scheme: document.components?.securitySchemes?.sessionCookie,
        global: document.security,
        public: [
          securityOf('/api/health', 'get'),
          securityOf('/api/auth/enrollment/options', 'post'),
          securityOf('/api/auth/enrollment/verify', 'post'),
          securityOf('/api/auth/sign-in/options', 'post'),
          securityOf('/api/auth/sign-in/verify', 'post'),
        ],
        protected: [
          securityOf('/api/auth/session', 'get'),
          securityOf('/api/muscle-groups', 'get'),
        ],
      }).toEqual({
        scheme: { type: 'apiKey', in: 'cookie', name: 'hd_session' },
        global: [{ sessionCookie: [] }],
        public: [[], [], [], [], []],
        protected: [undefined, undefined],
      })
    })
  })
})
