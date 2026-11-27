import { sql } from 'drizzle-orm'
import {
  blob,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const muscleGroups = sqliteTable('muscle_groups', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
})

export const muscles = sqliteTable('muscles', {
  id: text('id').primaryKey(),
  muscleGroupId: text('muscle_group_id')
    .notNull()
    .references(() => muscleGroups.id, { onDelete: 'restrict' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
})

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['reps', 'time'] }).notNull(),
    archivedAt: text('archived_at'),
  },
  (table) => [check('exercises_kind_check', sql`${table.kind} IN ('reps', 'time')`)],
)

export const exerciseMuscles = sqliteTable(
  'exercise_muscles',
  {
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    muscleId: text('muscle_id')
      .notNull()
      .references(() => muscles.id, { onDelete: 'restrict' }),
    role: text('role', { enum: ['primary', 'secondary'] }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseId, table.muscleId] }),
    check('exercise_muscles_role_check', sql`${table.role} IN ('primary', 'secondary')`),
  ],
)

export const backupRuns = sqliteTable(
  'backup_runs',
  {
    id: text('id').primaryKey(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at').notNull(),
    status: text('status', { enum: ['succeeded', 'failed'] }).notNull(),
    sizeBytes: integer('size_bytes'),
    error: text('error'),
  },
  (table) => [
    check('backup_runs_status_check', sql`${table.status} IN ('succeeded', 'failed')`),
    check(
      'backup_runs_size_bytes_check',
      sql`${table.sizeBytes} IS NULL OR ${table.sizeBytes} >= 0`,
    ),
  ],
)

export const weeklyGoals = sqliteTable(
  'weekly_goals',
  {
    id: text('id').primaryKey(),
    windows: integer('windows').notNull(),
    definedAt: text('defined_at').notNull(),
  },
  (table) => [
    check('weekly_goals_windows_check', sql`${table.windows} BETWEEN 1 AND 77`),
    index('weekly_goals_defined_at_idx').on(table.definedAt),
  ],
)

// One row per period of 12 weeks; the start of period 1 is the fact of the deploy and the
// others follow by arithmetic (ADR-039).
export const periods = sqliteTable(
  'periods',
  {
    id: text('id').primaryKey(),
    number: integer('number').notNull().unique(),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at').notNull(),
    intention: text('intention'),
    frozenAt: text('frozen_at'),
    // The summary of the snapshot, null until frozen_at (D99, ADR-039).
    windowsUsed: integer('windows_used'),
    windowsMissed: integer('windows_missed'),
    points: integer('points'),
    bestWorkoutPoints: integer('best_workout_points'),
    weekStreak: integer('week_streak'),
  },
  (table) => [
    check('periods_number_check', sql`${table.number} >= 1`),
    check(
      'periods_intention_check',
      sql`${table.intention} IS NULL OR length(${table.intention}) BETWEEN 1 AND 120`,
    ),
  ],
)

// Written once at the end of the period and never changed, even if a workout of the period is
// edited or the formula of the game changes (ADR-010, ADR-039).
export const periodSnapshots = sqliteTable(
  'period_snapshots',
  {
    id: text('id').primaryKey(),
    periodId: text('period_id')
      .notNull()
      .references(() => periods.id, { onDelete: 'restrict' }),
    muscleGroupId: text('muscle_group_id')
      .notNull()
      .references(() => muscleGroups.id, { onDelete: 'restrict' }),
    level: integer('level').notNull(),
    points: integer('points').notNull(),
    bestLevel: integer('best_level').notNull(),
    windowState: text('window_state', { enum: ['resting', 'open', 'cooling', 'none'] }).notNull(),
    windowsUsed: integer('windows_used').notNull(),
    windowsMissed: integer('windows_missed').notNull(),
  },
  (table) => [
    unique('period_snapshots_period_group_unique').on(table.periodId, table.muscleGroupId),
    check(
      'period_snapshots_window_state_check',
      sql`${table.windowState} IN ('resting', 'open', 'cooling', 'none')`,
    ),
  ],
)

// One row per browser that turned the notices on; the endpoint identifies it (ADR-035).
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// One row per notice and channel, written before the send: the unique key sends it at most once,
// and a row with no status is a send the process never finished (ADR-036).
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    noticeKey: text('notice_key').notNull(),
    kind: text('kind', { enum: ['window_open', 'window_close', 'level_drop'] }).notNull(),
    channel: text('channel', { enum: ['push', 'email'] }).notNull(),
    letter: text('letter'),
    muscleGroupSlugs: text('muscle_group_slugs').notNull(),
    dueAt: text('due_at').notNull(),
    eventAt: text('event_at').notNull(),
    createdAt: text('created_at').notNull(),
    status: text('status', { enum: ['sent', 'failed', 'skipped'] }),
    error: text('error'),
    finishedAt: text('finished_at'),
    // SHA-256 of the token of the link to turn the emails off, only on an email (ADR-037).
    unsubscribeTokenHash: text('unsubscribe_token_hash'),
  },
  (table) => [
    unique('notifications_notice_key_channel_unique').on(table.noticeKey, table.channel),
    uniqueIndex('notifications_unsubscribe_token_hash_unique').on(table.unsubscribeTokenHash),
    index('notifications_channel_created_at_idx').on(table.channel, table.createdAt),
    check(
      'notifications_kind_check',
      sql`${table.kind} IN ('window_open', 'window_close', 'level_drop')`,
    ),
    check('notifications_channel_check', sql`${table.channel} IN ('push', 'email')`),
    check(
      'notifications_status_check',
      sql`${table.status} IS NULL OR ${table.status} IN ('sent', 'failed', 'skipped')`,
    ),
  ],
)

export const authCredentials = sqliteTable(
  'auth_credentials',
  {
    id: text('id').primaryKey(),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
    counter: integer('counter').notNull(),
    transports: text('transports'),
    createdAt: text('created_at').notNull(),
    lastUsedAt: text('last_used_at'),
  },
  (table) => [check('auth_credentials_counter_check', sql`${table.counter} >= 0`)],
)

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
})

export const enrollmentTokens = sqliteTable('enrollment_tokens', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
})

export const programs = sqliteTable(
  'programs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    goal: text('goal', { enum: ['strength', 'hypertrophy', 'endurance'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('programs_goal_check', sql`${table.goal} IN ('strength', 'hypertrophy', 'endurance')`),
    uniqueIndex('programs_single_active_idx').on(table.isActive).where(sql`${table.isActive} = 1`),
  ],
)

export const programDays = sqliteTable(
  'program_days',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    letter: text('letter').notNull(),
    label: text('label'),
    position: integer('position').notNull(),
  },
  (table) => [
    check('program_days_letter_check', sql`${table.letter} GLOB '[A-Z]'`),
    unique('program_days_program_letter_unique').on(table.programId, table.letter),
    unique('program_days_program_position_unique').on(table.programId, table.position),
  ],
)

export const plannedExercises = sqliteTable(
  'planned_exercises',
  {
    id: text('id').primaryKey(),
    programDayId: text('program_day_id')
      .notNull()
      .references(() => programDays.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    sets: integer('sets').notNull(),
    targetReps: integer('target_reps'),
    targetSeconds: integer('target_seconds'),
    loadG: integer('load_g').notNull(),
    restSeconds: integer('rest_seconds').notNull(),
  },
  (table) => [
    check('planned_exercises_sets_check', sql`${table.sets} >= 1`),
    check(
      'planned_exercises_target_reps_check',
      sql`${table.targetReps} IS NULL OR ${table.targetReps} >= 1`,
    ),
    check(
      'planned_exercises_target_seconds_check',
      sql`${table.targetSeconds} IS NULL OR ${table.targetSeconds} >= 1`,
    ),
    check(
      'planned_exercises_single_target_check',
      sql`(${table.targetReps} IS NULL) <> (${table.targetSeconds} IS NULL)`,
    ),
    check('planned_exercises_load_g_check', sql`${table.loadG} >= 0`),
    check('planned_exercises_rest_seconds_check', sql`${table.restSeconds} >= 0`),
    unique('planned_exercises_day_position_unique').on(table.programDayId, table.position),
    unique('planned_exercises_day_exercise_unique').on(table.programDayId, table.exerciseId),
    index('planned_exercises_exercise_idx').on(table.exerciseId),
  ],
)

// The workout copies program_id and letter, so removing the day keeps what was trained (FR-009).
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    programDayId: text('program_day_id').references(() => programDays.id, {
      onDelete: 'set null',
    }),
    letter: text('letter').notNull(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    endReason: text('end_reason', { enum: ['completed', 'ended_early'] }),
  },
  (table) => [
    check('workouts_letter_check', sql`${table.letter} GLOB '[A-Z]'`),
    check(
      'workouts_end_reason_check',
      sql`${table.endReason} IS NULL OR ${table.endReason} IN ('completed', 'ended_early')`,
    ),
    index('workouts_program_idx').on(table.programId),
    index('workouts_program_day_idx').on(table.programDayId),
  ],
)

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    plannedExerciseId: text('planned_exercise_id').references(() => plannedExercises.id, {
      onDelete: 'set null',
    }),
    setNumber: integer('set_number').notNull(),
    loadG: integer('load_g').notNull(),
    reps: integer('reps'),
    seconds: integer('seconds'),
    performedAt: text('performed_at').notNull(),
    correctedAt: text('corrected_at'),
    // The plan of the moment of the record (ADR-033); all null for a set with no plan.
    plannedLoadG: integer('planned_load_g'),
    targetReps: integer('target_reps'),
    targetSeconds: integer('target_seconds'),
    // JSON object: the planned sets of each primary group of the exercise in the letter, at the
    // record (addendum to ADR-033); null when the workout has no letter left.
    plannedGroupSets: text('planned_group_sets', { mode: 'json' }).$type<Record<string, number>>(),
  },
  (table) => [
    check('workout_sets_set_number_check', sql`${table.setNumber} >= 1`),
    check('workout_sets_load_g_check', sql`${table.loadG} >= 0`),
    check('workout_sets_reps_check', sql`${table.reps} IS NULL OR ${table.reps} >= 1`),
    check('workout_sets_seconds_check', sql`${table.seconds} IS NULL OR ${table.seconds} >= 1`),
    check(
      'workout_sets_single_measure_check',
      sql`(${table.reps} IS NULL) <> (${table.seconds} IS NULL)`,
    ),
    check(
      'workout_sets_planned_load_g_check',
      sql`${table.plannedLoadG} IS NULL OR ${table.plannedLoadG} >= 0`,
    ),
    check(
      'workout_sets_target_reps_check',
      sql`${table.targetReps} IS NULL OR ${table.targetReps} >= 1`,
    ),
    check(
      'workout_sets_target_seconds_check',
      sql`${table.targetSeconds} IS NULL OR ${table.targetSeconds} >= 1`,
    ),
    check(
      'workout_sets_plan_check',
      sql`(${table.plannedLoadG} IS NULL AND ${table.targetReps} IS NULL AND ${table.targetSeconds} IS NULL) OR (${table.plannedLoadG} IS NOT NULL AND (${table.targetReps} IS NULL) <> (${table.targetSeconds} IS NULL))`,
    ),
    index('workout_sets_workout_idx').on(table.workoutId),
    index('workout_sets_exercise_idx').on(table.exerciseId),
    index('workout_sets_planned_exercise_idx').on(table.plannedExerciseId),
    uniqueIndex('workout_sets_workout_exercise_set_unique').on(
      table.workoutId,
      table.exerciseId,
      table.setNumber,
    ),
  ],
)

// One row per exercise left out of a workout; like workout_sets, it survives plan changes (FR-022).
export const workoutSkips = sqliteTable(
  'workout_skips',
  {
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    plannedExerciseId: text('planned_exercise_id').references(() => plannedExercises.id, {
      onDelete: 'set null',
    }),
    skippedAt: text('skipped_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workoutId, table.exerciseId] }),
    index('workout_skips_exercise_idx').on(table.exerciseId),
    index('workout_skips_planned_exercise_idx').on(table.plannedExerciseId),
  ],
)

export const oauthClients = sqliteTable('oauth_clients', {
  id: text('id').primaryKey(),
  clientName: text('client_name'),
  redirectUris: text('redirect_uris').notNull(),
  createdAt: text('created_at').notNull(),
  approvedAt: text('approved_at'),
})

export const oauthAuthorizationCodes = sqliteTable(
  'oauth_authorization_codes',
  {
    id: text('id').primaryKey(),
    codeHash: text('code_hash').notNull().unique(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    codeChallenge: text('code_challenge').notNull(),
    resource: text('resource').notNull(),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
  },
  (table) => [index('oauth_authorization_codes_client_idx').on(table.clientId)],
)

// One row per approval: rotation and revocation update it in place, see ADR-020.
export const oauthGrants = sqliteTable(
  'oauth_grants',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    resource: text('resource').notNull(),
    accessTokenHash: text('access_token_hash').notNull().unique(),
    accessExpiresAt: text('access_expires_at').notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull().unique(),
    previousRefreshTokenHash: text('previous_refresh_token_hash'),
    refreshExpiresAt: text('refresh_expires_at').notNull(),
    createdAt: text('created_at').notNull(),
    revokedAt: text('revoked_at'),
  },
  (table) => [
    index('oauth_grants_client_idx').on(table.clientId),
    index('oauth_grants_previous_refresh_idx').on(table.previousRefreshTokenHash),
  ],
)
