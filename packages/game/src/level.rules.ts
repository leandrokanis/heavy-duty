import { GAME_CONFIG, type GameConfig, type Tier } from './game.config.ts'
import { planRatioOf, type SetMeasure, type SetPlan } from './points.rules.ts'

// The level of a muscle group, the points on its bar and the highest level it ever had.
export type GroupProgress = { level: number; points: number; bestLevel: number }

export function startingProgress(
  config: Pick<GameConfig, 'minLevel'> = GAME_CONFIG,
): GroupProgress {
  return { level: config.minLevel, points: 0, bestLevel: config.minLevel }
}

// Decision D63: below its best level, in any state of the window, the group has muscle memory.
export function hasMuscleMemory({ level, bestLevel }: GroupProgress): boolean {
  return level < bestLevel
}

type CostConfig = Pick<GameConfig, 'levelBaseCost' | 'levelCostStep'>

// Decision D41: level n costs 40 + 3 × (n − 1) points.
export function levelCostOf(level: number, config: CostConfig = GAME_CONFIG): number {
  return config.levelBaseCost + config.levelCostStep * (level - 1)
}

const TIERS_FROM_TOP: Tier[] = ['violet', 'gold', 'silver', 'bronze']

export function tierOf(
  level: number,
  config: Pick<GameConfig, 'tierStartLevels'> = GAME_CONFIG,
): Tier {
  return TIERS_FROM_TOP.find((tier) => level >= config.tierStartLevels[tier]) ?? 'bronze'
}

export type GainRole = { role: 'primary' | 'secondary'; plannedGroupSets: number }

type GainConfig = Pick<
  GameConfig,
  'setPointsAtPlan' | 'maxPlanPercent' | 'groupPointsPerWorkout' | 'secondaryGainPercent'
>

// Decision D54: the primary group gets 10 × ratio × 6 ÷ its planned sets in the letter, so a
// complete workout yields about 60; the secondary group gets 10 × ratio × 0.5. Both times the
// multiplier of the group itself (D55). At least one planned set is counted.
export function groupGainOf(
  done: SetMeasure,
  plan: SetPlan | null,
  { role, plannedGroupSets }: GainRole,
  multiplierPercent: number,
  config: GainConfig = GAME_CONFIG,
): number {
  const { cappedVolume, plannedVolume } = planRatioOf(done, plan, config)
  const ratioTimesMultiplier = cappedVolume * multiplierPercent
  if (role === 'secondary') {
    return Math.round(
      (config.setPointsAtPlan * ratioTimesMultiplier * config.secondaryGainPercent) /
        (plannedVolume * 100 * 100 * 100),
    )
  }
  return Math.round(
    (config.groupPointsPerWorkout * ratioTimesMultiplier) /
      (plannedVolume * 100 * 100 * Math.max(1, plannedGroupSets)),
  )
}

export type GainResult = { progress: GroupProgress; levelsReached: number[] }

type LevelConfig = CostConfig & Pick<GameConfig, 'maxLevel'>

// The gain fills the bar and climbs every level it pays for, keeping the rest on the bar. The bar
// of the top level stays full (D58), and the best level never goes down.
export function addGroupGain(
  progress: GroupProgress,
  gain: number,
  config: LevelConfig = GAME_CONFIG,
): GainResult {
  let { level, points } = progress
  const levelsReached: number[] = []
  if (level < config.maxLevel) {
    points += gain
    while (level < config.maxLevel && points >= levelCostOf(level, config)) {
      points -= levelCostOf(level, config)
      level += 1
      levelsReached.push(level)
    }
  }
  if (level >= config.maxLevel) points = levelCostOf(config.maxLevel, config)
  return {
    progress: { level, points, bestLevel: Math.max(progress.bestLevel, level) },
    levelsReached,
  }
}
