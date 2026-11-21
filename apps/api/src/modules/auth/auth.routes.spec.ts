import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { createSessionCookie } from '../../test/session.js'
import {
  createFakeWebAuthn,
  FAKE_PUBLIC_KEY,
  type FakeWebAuthnOptions,
  fakeCeremonyResponse,
} from '../../test/webauthn.js'
import { hashToken } from './auth-token.js'
import {
  findCredentialByCredentialId,
  insertCredential,
  listCredentialIds,
} from './credential.repository.js'
import { createEnrollmentToken } from './enrollment.service.js'
import { findEnrollmentToken } from './enrollment-token.repository.js'

const T0 = new Date('2026-11-21T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

type AppSetup = {
  db?: Database
  now?: Date
  appOrigin?: string
  webAuthn?: FakeWebAuthnOptions
}

function createAuthApp(setup: AppSetup = {}) {
  const db = setup.db ?? createTestDatabase()
  const clock = { now: setup.now ?? T0 }
  const fake = createFakeWebAuthn(setup.webAuthn)
  const app = createApp({
    nodeEnv: 'test',
    databaseHealth: () => true,
    db,
    now: () => clock.now,
    appOrigin: setup.appOrigin ?? 'http://localhost:8080',
    webAuthn: fake.verifier,
  })
  return { app, db, clock, calls: fake.calls }
}

type App = ReturnType<typeof createApp>

function postJson(app: App, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function requestEnrollmentOptions(app: App, token: string) {
  return postJson(app, '/api/auth/enrollment/options', { token })
}

async function enroll(app: App, token: string, credentialId?: string) {
  const options = await requestEnrollmentOptions(app, token)
  const { challenge } = (await options.json()) as { challenge: string }
  return postJson(app, '/api/auth/enrollment/verify', {
    token,
    response: fakeCeremonyResponse(challenge, credentialId),
  })
}

function sessionCookieOf(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
}

describe('Given a valid session cookie', () => {
  describe('When GET /api/auth/session is requested', () => {
    it('Then should respond 200 with the expiry of the session', async () => {
      const { app, db } = createAuthApp()
      const cookie = createSessionCookie(db, T0)

      const response = await app.request('/api/auth/session', { headers: { cookie } })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 200,
        body: { expiresAt: '2026-12-21T12:00:00.000Z' },
      })
    })
  })

  describe('When DELETE /api/auth/session is requested', () => {
    it('Then should respond 204 with a Set-Cookie that expires hd_session, and the old cookie should get 401', async () => {
      const { app, db } = createAuthApp()
      const cookie = createSessionCookie(db, T0)

      const response = await app.request('/api/auth/session', {
        method: 'DELETE',
        headers: { cookie },
      })
      const afterSignOut = await app.request('/api/auth/session', { headers: { cookie } })

      expect({
        status: response.status,
        setCookie: response.headers.get('set-cookie'),
        afterSignOut: afterSignOut.status,
      }).toEqual({
        status: 204,
        setCookie: expect.stringMatching(/^hd_session=; Max-Age=0;.*Path=\//),
        afterSignOut: 401,
      })
    })
  })
})

describe('Given a session renewed 25 hours after T0', () => {
  async function renewedCookie(appOrigin: string): Promise<string> {
    const db = createTestDatabase()
    const cookie = createSessionCookie(db, T0)
    const { app } = createAuthApp({ db, appOrigin, now: new Date(T0.getTime() + 25 * HOUR_MS) })
    const response = await app.request('/api/auth/session', { headers: { cookie } })
    return response.headers.get('set-cookie') ?? ''
  }

  function attributes(setCookie: string): string[] {
    return setCookie
      .split(';')
      .slice(1)
      .map((attribute) => attribute.trim().split('=')[0] ?? '')
      .sort()
  }

  describe('When APP_ORIGIN is https://treino.example', () => {
    it('Then the cookie should have HttpOnly, SameSite=Lax, Path=/, Secure and a 30 day Max-Age, without Domain', async () => {
      const setCookie = await renewedCookie('https://treino.example')

      expect({
        attributes: attributes(setCookie),
        sameSite: /SameSite=Lax/.test(setCookie),
        path: /Path=\/(;|$)/.test(setCookie),
        maxAge: /Max-Age=2592000/.test(setCookie),
      }).toEqual({
        attributes: ['HttpOnly', 'Max-Age', 'Path', 'SameSite', 'Secure'],
        sameSite: true,
        path: true,
        maxAge: true,
      })
    })
  })

  describe('When APP_ORIGIN is http://localhost:8080', () => {
    it('Then the cookie should not have Secure', async () => {
      const setCookie = await renewedCookie('http://localhost:8080')

      expect(attributes(setCookie)).toEqual(['HttpOnly', 'Max-Age', 'Path', 'SameSite'])
    })
  })
})

describe('Given an enrollment token created by createEnrollmentToken', () => {
  describe('When enrollment options and then enrollment verify are requested with that token', () => {
    it('Then verify should respond 201 with hd_session, store one credential, mark the token used, and the new cookie should open GET /api/auth/session', async () => {
      const { app, db } = createAuthApp()
      const { token } = createEnrollmentToken(db, T0)

      const response = await enroll(app, token)
      const cookie = sessionCookieOf(response)
      const session = await app.request('/api/auth/session', { headers: { cookie } })

      expect({
        status: response.status,
        cookieName: cookie.split('=')[0],
        credentials: listCredentialIds(db).length,
        tokenUsedAt: findEnrollmentToken(db, hashToken(token))?.usedAt,
        sessionStatus: session.status,
      }).toEqual({
        status: 201,
        cookieName: 'hd_session',
        credentials: 1,
        tokenUsedAt: T0.toISOString(),
        sessionStatus: 200,
      })
    })
  })
})

describe('Given a passkey enrolled with a first enrollment token', () => {
  describe('When enrollment options are requested with a second token', () => {
    it('Then should keep the same user id and exclude the first passkey', async () => {
      const { app, db } = createAuthApp()
      const first = createEnrollmentToken(db, T0)
      const firstOptions = (await (await requestEnrollmentOptions(app, first.token)).json()) as {
        challenge: string
        user: { id: string }
      }
      await postJson(app, '/api/auth/enrollment/verify', {
        token: first.token,
        response: fakeCeremonyResponse(firstOptions.challenge, 'Zmlyc3QtcGFzc2tleQ'),
      })
      const second = createEnrollmentToken(db, T0)

      const secondOptions = (await (await requestEnrollmentOptions(app, second.token)).json()) as {
        user: { id: string }
        excludeCredentials: { id: string }[]
      }

      expect({
        userId: secondOptions.user.id,
        excluded: secondOptions.excludeCredentials.map((credential) => credential.id),
      }).toEqual({ userId: firstOptions.user.id, excluded: ['Zmlyc3QtcGFzc2tleQ'] })
    })
  })
})

const ENROLLMENT_TOKEN_INVALID = {
  code: 'enrollment_token_invalid',
  message: 'Link de cadastro inválido ou vencido. Gere outro link no servidor.',
}

const ENROLLMENT_FAILED = {
  code: 'enrollment_failed',
  message: 'Não foi possível criar a chave de acesso. Tente de novo.',
}

async function statusAndBody(response: Response) {
  return { status: response.status, body: await response.json() }
}

describe('Given an enrollment token that expired 15 minutes after T0', () => {
  describe('When options and verify are requested at T0 + 15 min + 1 ms', () => {
    it('Then both should respond 400 enrollment_token_invalid and no passkey should be stored', async () => {
      const { app, db, clock } = createAuthApp()
      const { token } = createEnrollmentToken(db, T0)
      const options = (await (await requestEnrollmentOptions(app, token)).json()) as {
        challenge: string
      }
      clock.now = new Date(T0.getTime() + 15 * 60 * 1000 + 1)

      const results = [
        await statusAndBody(await requestEnrollmentOptions(app, token)),
        await statusAndBody(
          await postJson(app, '/api/auth/enrollment/verify', {
            token,
            response: fakeCeremonyResponse(options.challenge),
          }),
        ),
      ]

      expect({ results, credentials: listCredentialIds(db).length }).toEqual({
        results: [
          { status: 400, body: ENROLLMENT_TOKEN_INVALID },
          { status: 400, body: ENROLLMENT_TOKEN_INVALID },
        ],
        credentials: 0,
      })
    })
  })
})

describe('Given an enrollment token already used to enroll a passkey', () => {
  describe('When options and verify are requested again with it', () => {
    it('Then both should respond 400 enrollment_token_invalid, keeping one passkey', async () => {
      const { app, db } = createAuthApp()
      const { token } = createEnrollmentToken(db, T0)
      await enroll(app, token)

      const results = [
        await statusAndBody(await requestEnrollmentOptions(app, token)),
        await statusAndBody(
          await postJson(app, '/api/auth/enrollment/verify', {
            token,
            response: fakeCeremonyResponse('dW51c2VkLWNoYWxsZW5nZQ'),
          }),
        ),
      ]

      expect({ results, credentials: listCredentialIds(db).length }).toEqual({
        results: [
          { status: 400, body: ENROLLMENT_TOKEN_INVALID },
          { status: 400, body: ENROLLMENT_TOKEN_INVALID },
        ],
        credentials: 1,
      })
    })
  })
})

describe('Given one enrollment token and two enrollment ceremonies started with it', () => {
  describe('When both verify requests run at the same time', () => {
    it('Then should store only one passkey', async () => {
      const { app, db } = createAuthApp()
      const { token } = createEnrollmentToken(db, T0)
      const challenges = await Promise.all(
        [1, 2].map(async () => {
          const options = await requestEnrollmentOptions(app, token)
          return ((await options.json()) as { challenge: string }).challenge
        }),
      )

      const statuses = (
        await Promise.all(
          challenges.map((challenge, index) =>
            postJson(app, '/api/auth/enrollment/verify', {
              token,
              response: fakeCeremonyResponse(challenge, `cGFzc2tleS0${index}`),
            }),
          ),
        )
      )
        .map((response) => response.status)
        .sort()

      expect({ statuses, credentials: listCredentialIds(db).length }).toEqual({
        statuses: [201, 400],
        credentials: 1,
      })
    })
  })
})

describe('Given a verifier that refuses the registration', () => {
  describe('When enrollment verify is requested', () => {
    it('Then should respond 400 enrollment_failed and leave the token unused', async () => {
      const { app, db } = createAuthApp({ webAuthn: { registration: 'refuse' } })
      const { token } = createEnrollmentToken(db, T0)

      const result = await statusAndBody(await enroll(app, token))

      expect({ result, usedAt: findEnrollmentToken(db, hashToken(token))?.usedAt }).toEqual({
        result: { status: 400, body: ENROLLMENT_FAILED },
        usedAt: null,
      })
    })
  })
})

describe('Given a registration verifier that throws an error carrying the challenge', () => {
  describe('When enrollment verify is requested', () => {
    it('Then should respond 400 enrollment_failed and log neither the challenge nor the token', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { app, db } = createAuthApp({ webAuthn: { registration: 'throw' } })
      const { token } = createEnrollmentToken(db, T0)
      const options = (await (await requestEnrollmentOptions(app, token)).json()) as {
        challenge: string
      }

      const result = await statusAndBody(
        await postJson(app, '/api/auth/enrollment/verify', {
          token,
          response: fakeCeremonyResponse(options.challenge),
        }),
      )
      const logged = JSON.stringify(consoleError.mock.calls.map((call) => call.map(String)))
      consoleError.mockRestore()

      expect({
        result,
        logsChallenge: logged.includes(options.challenge),
        logsToken: logged.includes(token),
      }).toEqual({
        result: { status: 400, body: ENROLLMENT_FAILED },
        logsChallenge: false,
        logsToken: false,
      })
    })
  })
})

describe('Given an enrollment challenge already used by an accepted enrollment', () => {
  describe('When verify is requested with a second token and the same challenge', () => {
    it('Then should respond 400 enrollment_failed and keep one passkey', async () => {
      const { app, db } = createAuthApp()
      const first = createEnrollmentToken(db, T0)
      const options = (await (await requestEnrollmentOptions(app, first.token)).json()) as {
        challenge: string
      }
      await postJson(app, '/api/auth/enrollment/verify', {
        token: first.token,
        response: fakeCeremonyResponse(options.challenge, 'Zmlyc3Q'),
      })
      const second = createEnrollmentToken(db, T0)

      const replay = await statusAndBody(
        await postJson(app, '/api/auth/enrollment/verify', {
          token: second.token,
          response: fakeCeremonyResponse(options.challenge, 'c2Vjb25k'),
        }),
      )

      expect({ replay, credentials: listCredentialIds(db).length }).toEqual({
        replay: { status: 400, body: ENROLLMENT_FAILED },
        credentials: 1,
      })
    })
  })
})

describe('Given refused enrollment requests', () => {
  describe('When their bodies are read', () => {
    it('Then should not contain the enrollment token', async () => {
      const { app, db } = createAuthApp({ webAuthn: { registration: 'refuse' } })
      const { token } = createEnrollmentToken(db, T0)
      const refused = await enroll(app, token)
      const expired = createAuthApp({ db, now: new Date(T0.getTime() + 60 * 60 * 1000) })
      const invalid = await requestEnrollmentOptions(expired.app, token)

      const bodies = (await refused.text()) + (await invalid.text())

      expect(bodies.includes(token)).toBe(false)
    })
  })
})

describe('Given enrollment verify with an empty body object', () => {
  describe('When it is requested', () => {
    it('Then should respond 400 enrollment_token_invalid, not 500', async () => {
      const { app } = createAuthApp()

      const result = await statusAndBody(await postJson(app, '/api/auth/enrollment/verify', {}))

      expect(result).toEqual({ status: 400, body: ENROLLMENT_TOKEN_INVALID })
    })
  })
})

function storeCredential(db: Database, credentialId: string, counter: number) {
  insertCredential(db, {
    id: createId(),
    credentialId,
    publicKey: Buffer.from(FAKE_PUBLIC_KEY),
    counter,
    transports: JSON.stringify(['internal']),
    createdAt: T0.toISOString(),
    lastUsedAt: null,
  })
}

async function signIn(app: App, credentialId: string) {
  const options = await app.request('/api/auth/sign-in/options', { method: 'POST' })
  const { challenge } = (await options.json()) as { challenge: string }
  return postJson(app, '/api/auth/sign-in/verify', {
    response: fakeCeremonyResponse(challenge, credentialId),
  })
}

describe('Given a stored passkey with counter 4 and a verifier that accepts with counter 5', () => {
  describe('When sign-in options and sign-in verify are requested', () => {
    it('Then verify should respond 200 with hd_session, store counter 5 and last_used_at, and the cookie should open GET /api/auth/session', async () => {
      const { app, db } = createAuthApp({ webAuthn: { newCounter: 5 } })
      storeCredential(db, 'cGhvbmUtcGFzc2tleQ', 4)

      const response = await signIn(app, 'cGhvbmUtcGFzc2tleQ')
      const cookie = sessionCookieOf(response)
      const session = await app.request('/api/auth/session', { headers: { cookie } })
      const stored = findCredentialByCredentialId(db, 'cGhvbmUtcGFzc2tleQ')

      expect({
        status: response.status,
        cookieName: cookie.split('=')[0],
        counter: stored?.counter,
        lastUsedAt: stored?.lastUsedAt,
        sessionStatus: session.status,
      }).toEqual({
        status: 200,
        cookieName: 'hd_session',
        counter: 5,
        lastUsedAt: T0.toISOString(),
        sessionStatus: 200,
      })
    })

    it('Then the verifier should receive the stored counter 4 and the stored public key', async () => {
      const { app, db, calls } = createAuthApp({ webAuthn: { newCounter: 5 } })
      storeCredential(db, 'cGhvbmUtcGFzc2tleQ', 4)

      await signIn(app, 'cGhvbmUtcGFzc2tleQ')

      expect(calls.verifyAuthentication.map(({ credential }) => credential)).toEqual([
        {
          credentialId: 'cGhvbmUtcGFzc2tleQ',
          publicKey: FAKE_PUBLIC_KEY,
          counter: 4,
          transports: ['internal'],
        },
      ])
    })
  })
})

describe('Given two stored passkeys', () => {
  describe('When each one signs in', () => {
    it('Then both should respond 200', async () => {
      const { app, db } = createAuthApp()
      storeCredential(db, 'cGhvbmU', 0)
      storeCredential(db, 'bWFj', 0)

      const statuses = [(await signIn(app, 'cGhvbmU')).status, (await signIn(app, 'bWFj')).status]

      expect(statuses).toEqual([200, 200])
    })
  })
})

const SIGN_IN_FAILED = {
  code: 'sign_in_failed',
  message: 'Não foi possível entrar. Tente de novo.',
}

function countSessions(db: Database): number {
  return (
    db.$client.prepare('SELECT COUNT(*) AS total FROM auth_sessions').get() as { total: number }
  ).total
}

async function requestSignInChallenge(app: App): Promise<string> {
  const options = await app.request('/api/auth/sign-in/options', { method: 'POST' })
  return ((await options.json()) as { challenge: string }).challenge
}

function verifySignIn(app: App, challenge: string, credentialId: string) {
  return postJson(app, '/api/auth/sign-in/verify', {
    response: fakeCeremonyResponse(challenge, credentialId),
  })
}

describe('Given a sign-in with a passkey that is not stored', () => {
  describe('When sign-in verify is requested', () => {
    it('Then should respond 401 sign_in_failed and create no session', async () => {
      const { app, db } = createAuthApp()
      storeCredential(db, 'c3RvcmVk', 0)

      const result = await statusAndBody(await signIn(app, 'dW5rbm93bg'))

      expect({ result, sessions: countSessions(db) }).toEqual({
        result: { status: 401, body: SIGN_IN_FAILED },
        sessions: 0,
      })
    })
  })
})

describe('Given a verifier that refuses the authentication, as for a lower counter, a bad signature or another origin', () => {
  describe('When sign-in verify is requested', () => {
    it('Then should respond 401 sign_in_failed and create no session', async () => {
      const { app, db } = createAuthApp({ webAuthn: { authentication: 'refuse' } })
      storeCredential(db, 'c3RvcmVk', 4)

      const result = await statusAndBody(await signIn(app, 'c3RvcmVk'))

      expect({ result, sessions: countSessions(db) }).toEqual({
        result: { status: 401, body: SIGN_IN_FAILED },
        sessions: 0,
      })
    })
  })
})

describe('Given an authentication verifier that throws an error carrying the challenge', () => {
  describe('When sign-in verify is requested', () => {
    it('Then should respond 401 sign_in_failed and not log the challenge', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { app, db } = createAuthApp({ webAuthn: { authentication: 'throw' } })
      storeCredential(db, 'c3RvcmVk', 0)
      const challenge = await requestSignInChallenge(app)

      const result = await statusAndBody(await verifySignIn(app, challenge, 'c3RvcmVk'))
      const logged = JSON.stringify(consoleError.mock.calls.map((call) => call.map(String)))
      consoleError.mockRestore()

      expect({
        result,
        sessions: countSessions(db),
        logsChallenge: logged.includes(challenge),
      }).toEqual({
        result: { status: 401, body: SIGN_IN_FAILED },
        sessions: 0,
        logsChallenge: false,
      })
    })
  })
})

describe('Given a sign-in challenge issued at T0', () => {
  describe('When sign-in verify uses it at T0 + 5 min + 1 ms', () => {
    it('Then should respond 401 sign_in_failed and create no session', async () => {
      const { app, db, clock } = createAuthApp()
      storeCredential(db, 'c3RvcmVk', 0)
      const challenge = await requestSignInChallenge(app)
      clock.now = new Date(T0.getTime() + 5 * 60 * 1000 + 1)

      const result = await statusAndBody(await verifySignIn(app, challenge, 'c3RvcmVk'))

      expect({ result, sessions: countSessions(db) }).toEqual({
        result: { status: 401, body: SIGN_IN_FAILED },
        sessions: 0,
      })
    })
  })

  describe('When sign-in verify uses it a second time after a successful sign-in', () => {
    it('Then should respond 401 sign_in_failed and keep one session', async () => {
      const { app, db } = createAuthApp()
      storeCredential(db, 'c3RvcmVk', 0)
      const challenge = await requestSignInChallenge(app)
      await verifySignIn(app, challenge, 'c3RvcmVk')

      const result = await statusAndBody(await verifySignIn(app, challenge, 'c3RvcmVk'))

      expect({ result, sessions: countSessions(db) }).toEqual({
        result: { status: 401, body: SIGN_IN_FAILED },
        sessions: 1,
      })
    })
  })
})

describe('Given a challenge issued for an enrollment', () => {
  describe('When sign-in verify uses it', () => {
    it('Then should respond 401 sign_in_failed and create no session', async () => {
      const { app, db } = createAuthApp()
      storeCredential(db, 'c3RvcmVk', 0)
      const { token } = createEnrollmentToken(db, T0)
      const options = (await (await requestEnrollmentOptions(app, token)).json()) as {
        challenge: string
      }

      const result = await statusAndBody(await verifySignIn(app, options.challenge, 'c3RvcmVk'))

      expect({ result, sessions: countSessions(db) }).toEqual({
        result: { status: 401, body: SIGN_IN_FAILED },
        sessions: 0,
      })
    })
  })
})

describe('Given sign-in verify with an empty body object', () => {
  describe('When it is requested', () => {
    it('Then should respond 401 sign_in_failed, not 500', async () => {
      const { app } = createAuthApp()

      const result = await statusAndBody(await postJson(app, '/api/auth/sign-in/verify', {}))

      expect(result).toEqual({ status: 401, body: SIGN_IN_FAILED })
    })
  })
})
