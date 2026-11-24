import { GAME_CONFIG, type GameConfig } from './game.config.ts'
import { type GroupProgress, levelCostOf } from './level.rules.ts'

const DAY_MS = 24 * 60 * 60 * 1000

type CoolingConfig = Pick<GameConfig, 'coolingPointsPerDay'>

// Decisions D43 and D58: about 40 points a day, lost continuously in whole points from the close.
export function coolingLossOf(elapsedMs: number, config: CoolingConfig = GAME_CONFIG): number {
  if (elapsedMs <= 0) return 0
  return Math.floor((elapsedMs * config.coolingPointsPerDay) / DAY_MS)
}

type LossConfig = Pick<GameConfig, 'levelBaseCost' | 'levelCostStep' | 'minLevel'>

// Decision D58: when the bar reaches zero the group drops a level, and the bar of the level below
// starts full; level 1 stops at an empty bar. The best level never goes down.
export function subtractCoolingLoss(
  progress: GroupProgress,
  loss: number,
  config: LossConfig = GAME_CONFIG,
): GroupProgress {
  let { level } = progress
  let points = progress.points - loss
  while (points <= 0 && level > config.minLevel) {
    level -= 1
    points += levelCostOf(level, config)
  }
  return { level, points: Math.max(0, points), bestLevel: progress.bestLevel }
}

// The instant the group drops a level, from the loss so far and the points left on the bar; null
// at the lowest level, which never drops.
export function nextDropAtMsOf(
  closesAtMs: number,
  lossSoFar: number,
  progress: GroupProgress,
  config: CoolingConfig & Pick<GameConfig, 'minLevel'> = GAME_CONFIG,
): number | null {
  if (progress.level <= config.minLevel) return null
  const lossAtDrop = lossSoFar + progress.points
  return closesAtMs + Math.ceil((lossAtDrop * DAY_MS) / config.coolingPointsPerDay)
}
