import { swaggerUI } from '@hono/swagger-ui'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { DEFAULT_NOTICE_TIME_ZONE } from './config/notifications-env.js'
import type { Database } from './db/connection.js'
import { createRouter, handleError, handleNotFound } from './http/errors.js'
import { originGuard } from './http/origin-guard.js'
import { mcpBearerGuard } from './mcp/bearer-guard.js'
import { DEFAULT_MCP_ALLOWED_HOSTS, mcpHostGuard } from './mcp/host-guard.js'
import { handleMcpRequest, MCP_PATH } from './mcp/server.js'
import { createAuthRoutes } from './modules/auth/auth.routes.js'
import { createChallengeStore } from './modules/auth/challenge-store.js'
import { createOAuthRoutes } from './modules/auth/oauth.routes.js'
import { createOAuthMetadataRoutes } from './modules/auth/oauth-metadata.routes.js'
import { requireSession } from './modules/auth/session.middleware.js'
import { createWebAuthnVerifier, type WebAuthnVerifier } from './modules/auth/webauthn.js'
import { createExerciseRoutes } from './modules/catalog/exercise.routes.js'
import { createMuscleRoutes } from './modules/catalog/muscle.routes.js'
import { createMuscleGroupRoutes } from './modules/catalog/muscle-group.routes.js'
import { createMedalsRoutes } from './modules/medals/medals.routes.js'
import { createEmailOptOutRoutes } from './modules/notifications/email-opt-out.routes.js'
import { createNotificationsRoutes } from './modules/notifications/notifications.routes.js'
import { createPeriodsRoutes } from './modules/periods/periods.routes.js'
import { createProgramRoutes } from './modules/programs/program.routes.js'
import { createHealthRoutes } from './modules/system/health.routes.js'
import type { DatabaseHealthProbe } from './modules/system/health.service.js'
import { createSystemStatusRoutes } from './modules/system/system-status.routes.js'
import { createWindowsRoutes } from './modules/windows/windows.routes.js'
import { createTodayRoutes } from './modules/workouts/today.routes.js'
import { createWorkoutDeleteRoutes } from './modules/workouts/workout-delete.routes.js'
import { createWorkoutFinishRoutes } from './modules/workouts/workout-finish.routes.js'
import { createWorkoutHistoryRoutes } from './modules/workouts/workout-history.routes.js'
import { createWorkoutSetRoutes } from './modules/workouts/workout-set.routes.js'
import { createWorkoutSetCorrectionRoutes } from './modules/workouts/workout-set-correction.routes.js'
import { createWorkoutSkipRoutes } from './modules/workouts/workout-skip.routes.js'
import {
  OPENAPI_CONFIG,
  OPENAPI_DOCUMENT_PATH,
  SESSION_COOKIE_SECURITY_SCHEME,
} from './openapi/document.js'

export type AppOptions = {
  nodeEnv: string
  databaseHealth: DatabaseHealthProbe
  db?: Database
  mcpAllowedHosts?: readonly string[]
  appOrigin?: string
  now?: () => Date
  webAuthn?: WebAuthnVerifier
  // Set only when the push channel is configured (ADR-035).
  pushPublicKey?: string
  // True only when SMTP_HOST, MAIL_FROM and MAIL_TO are set (ADR-037).
  emailConfigured?: boolean
  // NOTICE_TIME_ZONE, also the zone of the weeks and periods of the server (ADR-039).
  timeZone?: string
}

export const DEFAULT_APP_ORIGIN = 'http://localhost:8080'
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const CHALLENGE_CAPACITY = 100

export function createApp(options: AppOptions): OpenAPIHono {
  const app = createRouter()
  const appOrigin = options.appOrigin ?? DEFAULT_APP_ORIGIN
  const now = options.now ?? (() => new Date())
  const timeZone = options.timeZone ?? DEFAULT_NOTICE_TIME_ZONE
  const noticeChannels = {
    push: options.pushPublicKey !== undefined,
    email: options.emailConfigured === true,
  }

  // Without a database no session can be checked, so only the health route answers.
  if (options.db) {
    app.use('/api/*', originGuard(appOrigin))
    app.use('/api/*', requireSession({ db: options.db, now, appOrigin }))
  }

  app.route('/', createHealthRoutes(options.databaseHealth))

  if (options.db) {
    const webAuthn =
      options.webAuthn ?? createWebAuthnVerifier({ appOrigin, rpId: new URL(appOrigin).hostname })
    const challenges = createChallengeStore({
      now,
      ttlMs: CHALLENGE_TTL_MS,
      capacity: CHALLENGE_CAPACITY,
    })
    app.route('/', createAuthRoutes({ db: options.db, now, appOrigin, webAuthn, challenges }))
    app.route('/', createOAuthMetadataRoutes(appOrigin))
    app.route('/', createOAuthRoutes({ db: options.db, now, appOrigin }))
    app.route('/', createMuscleGroupRoutes(options.db))
    app.route('/', createMuscleRoutes(options.db))
    app.route('/', createExerciseRoutes(options.db))
    app.route('/', createProgramRoutes({ db: options.db, now }))
    app.route('/', createSystemStatusRoutes(options.db, noticeChannels))
    app.route('/', createTodayRoutes(options.db))
    app.route('/', createWorkoutSetRoutes(options.db))
    app.route('/', createWorkoutSetCorrectionRoutes({ db: options.db, now }))
    app.route('/', createWorkoutFinishRoutes(options.db))
    app.route('/', createWorkoutSkipRoutes(options.db))
    app.route('/', createWorkoutHistoryRoutes(options.db))
    app.route('/', createWorkoutDeleteRoutes(options.db))
    app.route('/', createWindowsRoutes({ db: options.db, now }))
    app.route('/', createPeriodsRoutes({ db: options.db, now, timeZone }))
    app.route('/', createMedalsRoutes({ db: options.db, now, timeZone }))
    app.route(
      '/',
      createNotificationsRoutes({ db: options.db, now, pushPublicKey: options.pushPublicKey }),
    )
    app.route('/', createEmailOptOutRoutes({ db: options.db, now }))
    app.openAPIRegistry.registerComponent(
      'securitySchemes',
      'sessionCookie',
      SESSION_COOKIE_SECURITY_SCHEME,
    )
    app.doc31(OPENAPI_DOCUMENT_PATH, OPENAPI_CONFIG)
    app.get('/api/docs', swaggerUI({ url: OPENAPI_DOCUMENT_PATH }))
  }

  // Without a database no credential can be checked, so /mcp is not mounted, see ADR-020.
  if (options.db) {
    const toolDeps = { db: options.db, now, noticeChannels, timeZone }
    app.use(MCP_PATH, mcpHostGuard(options.mcpAllowedHosts ?? DEFAULT_MCP_ALLOWED_HOSTS))
    app.use(MCP_PATH, mcpBearerGuard({ db: options.db, now, appOrigin }))
    app.all(MCP_PATH, (c) => handleMcpRequest(c, toolDeps))
  }

  app.notFound(handleNotFound)
  app.onError(handleError)

  return app
}
