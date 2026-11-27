import { asc } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exercises } from '../../db/schema.js'
import { DomainError } from '../../errors/domain-error.js'
import { listMedalAwards } from '../medals/medal.repository.js'
import { MEDAL_CATALOG } from '../medals/medals.catalog.js'
import { findPeriod, listWorkoutsStartedBetween } from '../periods/period.repository.js'
import { weeksUntilNowOf } from '../periods/period.service.js'
import { periodRankingOf, pointsStartedBetween } from '../periods/ranking.rules.js'
import { weekStreakOf } from '../periods/week-streak.rules.js'
import { gameReplayOf, groupLevelsOf } from '../windows/progress.rules.js'
import { loadProgressSets } from '../windows/progress.service.js'
import { groupTrainingsOf } from '../windows/window.rules.js'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { listMuscleGroups } from '../windows/windows.repository.js'
import { windowsUsedByWeek } from '../windows/windows-used.rules.js'
import { weeklyDigestSubjectOf } from './email-digest.js'
import { capitalized } from './notice-format.js'
import { type DigestWeek, type WeeklyDigest, weeklyDigestOf } from './weekly-digest.rules.js'
import type { WeeklyDigestQuery, WeeklyDigestView } from './weekly-digest.schemas.js'

const iso = (instantMs: number) => new Date(instantMs).toISOString()

type PeriodWeek = ReturnType<typeof weeksUntilNowOf>[number]

// The weeks of the periods from period 1 to the week of now; none before the first period exists.
export function digestWeeksOf(db: Database, nowMs: number): PeriodWeek[] {
  if (!findPeriod(db, 1)) return []
  const sets = loadProgressSets(db)
  return weeksUntilNowOf(db, groupTrainingsOf(sets, GAME_PARAMETERS), nowMs)
}

function exerciseNamesOf(db: Database): Map<string, string> {
  const rows = db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .orderBy(asc(exercises.id))
    .all()
  return new Map(rows.map(({ id, name }) => [id, name]))
}

// The content of one week, derived from the history at each call (ADR-010, ADR-041): the same
// windows, streak and points as the Period screen, and the medals stored in medal_awards.
export function weeklyDigestFor(db: Database, week: DigestWeek, nowMs: number): WeeklyDigest {
  const sets = loadProgressSets(db)
  const weeks = weeksUntilNowOf(db, groupTrainingsOf(sets, GAME_PARAMETERS), nowMs)
  const index = weeks.findIndex(({ fromMs }) => fromMs === week.startsAtMs)
  const periodWeek = weeks[index]
  const [counted] = windowsUsedByWeek({
    trainingsOfGroups: groupTrainingsOf(sets, GAME_PARAMETERS).values(),
    parameters: GAME_PARAMETERS,
    fromMs: week.startsAtMs,
    weekCount: 1,
    nowMs,
  })
  const ranking = periodRankingOf({
    workouts: listWorkoutsStartedBetween(db, iso(week.startsAtMs), iso(week.endsAtMs)),
    setPoints: gameReplayOf(sets, GAME_PARAMETERS, nowMs).setPoints,
    startsAtMs: week.startsAtMs,
    endsAtMs: week.endsAtMs,
  })
  const levelsAt = (instantMs: number) =>
    groupLevelsOf(
      sets.filter(({ performedAtMs }) => performedAtMs < instantMs),
      GAME_PARAMETERS,
      instantMs,
    )
  const endMs = Math.min(week.endsAtMs, nowMs)
  const atStart = levelsAt(week.startsAtMs)
  const atEnd = levelsAt(endMs)
  const names = exerciseNamesOf(db)
  const groupNames = new Map(listMuscleGroups(db).map(({ slug, name }) => [slug, name]))
  const medalNames = new Map<string, string>(MEDAL_CATALOG.map(({ code, name }) => [code, name]))
  return weeklyDigestOf({
    week,
    weeklyGoal: periodWeek?.weeklyGoal ?? null,
    windowsUsed: counted?.windowsUsed ?? 0,
    windowsMissed: counted?.windowsMissed ?? 0,
    weekPoints: pointsStartedBetween(ranking, week.startsAtMs, week.endsAtMs),
    weekStreak: index < 0 ? 0 : weekStreakOf(weeks.slice(0, index + 1)).weeks,
    levels: [...groupNames].map(([slug, name]) => ({
      slug,
      name,
      levelAtStart: atStart.get(slug)?.progress.level ?? 1,
      levelAtEnd: atEnd.get(slug)?.progress.level ?? 1,
    })),
    sets: sets.map((set) => ({
      workoutId: set.workoutId,
      exerciseId: set.exerciseId,
      exerciseName: names.get(set.exerciseId) ?? set.exerciseId,
      performedAtMs: set.performedAtMs,
      loadG: set.loadG,
      reps: set.reps,
    })),
    medals: listMedalAwards(db).map(({ medalCode, subject, awardedAt }) => {
      const name = medalNames.get(medalCode) ?? medalCode
      const group = subject === null ? null : (groupNames.get(subject) ?? subject)
      return {
        name: group === null ? name : `${name} · ${capitalized(group)}`,
        awardedAtMs: Date.parse(awardedAt),
      }
    }),
  })
}

function weekOf(weeks: PeriodWeek[], query: WeeklyDigestQuery, nowMs: number): PeriodWeek {
  if (query.at !== undefined) {
    const atMs = Date.parse(query.at)
    const found = weeks.find(({ fromMs, toMs }) => fromMs <= atMs && atMs < toMs)
    if (Number.isNaN(atMs) || !found) {
      throw new DomainError(
        'weekly_digest_week_invalid',
        'informe um instante de uma semana do período, até a semana atual',
        'invalid',
      )
    }
    return found
  }
  return weeks.filter(({ toMs }) => toMs <= nowMs).at(-1) ?? (weeks.at(-1) as PeriodWeek)
}

// The preview of the digest, with no email sent (ADR-041); the email links stay out.
export function getWeeklyDigest(
  db: Database,
  query: WeeklyDigestQuery,
  now: Date,
): WeeklyDigestView {
  const nowMs = now.getTime()
  const weeks = digestWeeksOf(db, nowMs)
  if (weeks.length === 0) {
    throw new DomainError('weekly_digest_week_invalid', 'ainda não há período', 'invalid')
  }
  const week = weekOf(weeks, query, nowMs)
  const digest = weeklyDigestFor(db, { startsAtMs: week.fromMs, endsAtMs: week.toMs }, nowMs)
  return {
    now: now.toISOString(),
    weekStartsAt: iso(digest.weekStartsAtMs),
    weekEndsAt: iso(digest.weekEndsAtMs),
    ended: week.toMs <= nowMs,
    subject: weeklyDigestSubjectOf(digest),
    weeklyGoal: digest.weeklyGoal,
    windowsUsed: digest.windowsUsed,
    windowsMissed: digest.windowsMissed,
    weekPoints: digest.weekPoints,
    weekStreak: digest.weekStreak,
    levels: digest.levels.map(({ slug, name, from, to }) => ({
      muscleGroup: { slug, name },
      from,
      to,
    })),
    records: digest.records,
    medals: digest.medals,
  }
}
