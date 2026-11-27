import type { Database } from '../../db/connection.js'
import { syncMedalAwards } from '../medals/medal.service.js'
import { GAME_TICK_MS } from './periods.config.js'
import { freezeEndedPeriods } from './snapshot.service.js'

export type GameLog = { error: (message: string) => void }

export type GameTickDeps = {
  db: Database
  now: () => Date
  timeZone: string
  log: GameLog
}

export type RunningGameScheduler = { stop: () => Promise<void> }

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

// The game derives from the database at each tick and keeps nothing in memory, so a restart
// catches up on what passed with the server stopped: the periods to open and to freeze (ADR-039).
export async function runGameTick(deps: GameTickDeps): Promise<void> {
  try {
    freezeEndedPeriods(deps.db, deps.now(), deps.timeZone)
  } catch (error) {
    deps.log.error(
      `game: could not ensure the current period and freeze the ended ones: ${messageOf(error)}`,
    )
  }
  // A medal reached with no read of the app is stored with the instant of its event (ADR-040).
  try {
    syncMedalAwards(deps.db, deps.now(), deps.timeZone)
  } catch (error) {
    deps.log.error(`game: could not sync the medals: ${messageOf(error)}`)
  }
}

// Always on, apart from the scheduler of the notices, which starts only with a channel (ADR-039).
export function startGameScheduler(
  deps: GameTickDeps & { intervalMs?: number },
): RunningGameScheduler {
  let running: Promise<void> | null = null
  const tick = () => {
    if (running) return
    running = runGameTick(deps).finally(() => {
      running = null
    })
  }
  const timer = setInterval(tick, deps.intervalMs ?? GAME_TICK_MS)
  tick()
  return {
    async stop() {
      clearInterval(timer)
      await running
    },
  }
}
