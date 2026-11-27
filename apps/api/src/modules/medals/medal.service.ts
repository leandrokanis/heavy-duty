import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { listPeriods } from '../periods/period.repository.js'
import { ensurePeriods, weeksUntilNowOf } from '../periods/period.service.js'
import { findActiveProgramRow, listProgramDayRows } from '../programs/program.repository.js'
import { gameReplayOf } from '../windows/progress.rules.js'
import { loadProgressSets } from '../windows/progress.service.js'
import { groupTrainingsOf } from '../windows/window.rules.js'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { listMuscleGroups } from '../windows/windows.repository.js'
import { insertMedalAward, listMedalAwards, listMedalWorkouts } from './medal.repository.js'
import { MEDAL_CATALOG, type MedalCode } from './medals.catalog.js'
import { type MedalAward, type MedalHistory, medalAwardsOf } from './medals.rules.js'
import type { Medals } from './medals.schemas.js'

// Stores the medals not yet awarded, with the instant of the event; returns their codes. An award
// that the rules no longer find stays (ADR-040).
export function recordMedalAwards(
  db: Database,
  awards: readonly MedalAward[],
  now: Date,
): MedalCode[] {
  return awards.flatMap((award) =>
    insertMedalAward(db, {
      id: createId(now.getTime()),
      medalCode: award.code,
      subject: award.subject,
      workoutId: award.workoutId,
      awardedAt: new Date(award.awardedAtMs).toISOString(),
    })
      ? [award.code]
      : [],
  )
}

// The whole catalog; a hidden medal not yet awarded comes with no name, criterion nor icon.
export function medalShelfOf(db: Database, now: Date): Medals {
  const awards = new Map(listMedalAwards(db).map((award) => [award.medalCode, award]))
  const groupNames = new Map(listMuscleGroups(db).map(({ slug, name }) => [slug, name]))
  return {
    now: now.toISOString(),
    medals: MEDAL_CATALOG.map((medal) => {
      const award = awards.get(medal.code)
      const shown = !medal.hidden || award !== undefined
      const subject = award?.subject ?? null
      return {
        code: medal.code,
        name: shown ? medal.name : null,
        criterion: shown ? medal.criterion : null,
        icon: shown ? medal.icon : null,
        hidden: medal.hidden,
        awardedAt: award?.awardedAt ?? null,
        subject:
          subject === null ? null : { slug: subject, name: groupNames.get(subject) ?? subject },
        workoutId: award?.workoutId ?? null,
      }
    }),
  }
}

// The whole history from the database, derived at each call (ADR-010): the replay of the levels,
// the weeks of the periods with the streak at the end of each one, the workouts and the letters of
// the active program.
export function loadMedalHistory(db: Database, now: Date, timeZone: string): MedalHistory {
  ensurePeriods(db, now, timeZone)
  const nowMs = now.getTime()
  const sets = loadProgressSets(db)
  const { levelSteps } = gameReplayOf(sets, GAME_PARAMETERS, nowMs)
  const weeks = weeksUntilNowOf(db, groupTrainingsOf(sets, GAME_PARAMETERS), nowMs)
  let weekStreak = 0
  const program = findActiveProgramRow(db)
  return {
    sets,
    workouts: listMedalWorkouts(db).map(({ startedAt, ...workout }) => ({
      ...workout,
      startedAtMs: Date.parse(startedAt),
    })),
    levelSteps,
    periods: listPeriods(db).map(({ number, startsAt, endsAt }) => ({
      number,
      startsAtMs: Date.parse(startsAt),
      endsAtMs: Date.parse(endsAt),
    })),
    // The status of each week says how the streak moves: met adds, missed breaks (D101).
    weeks: weeks.map(({ fromMs, toMs, weeklyGoal, status }) => {
      if (status === 'met') weekStreak += 1
      if (status === 'missed') weekStreak = 0
      return { startsAtMs: fromMs, endsAtMs: toMs, weeklyGoal, weekStreak }
    }),
    activeProgram: program
      ? {
          id: program.id,
          letters: listProgramDayRows(db, [program.id]).map(({ letter }) => letter),
        }
      : null,
    parameters: GAME_PARAMETERS,
    nowMs,
  }
}

// Detects the medals in the history and stores the new ones, on each read and on each tick of the
// game scheduler (ADR-040); returns the codes stored now.
export function syncMedalAwards(db: Database, now: Date, timeZone: string): MedalCode[] {
  return recordMedalAwards(db, medalAwardsOf(loadMedalHistory(db, now, timeZone)), now)
}

export function listMedals(db: Database, now: Date, timeZone: string): Medals {
  syncMedalAwards(db, now, timeZone)
  return medalShelfOf(db, now)
}
