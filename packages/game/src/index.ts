export { coolingLossOf, nextDropAtMsOf, subtractCoolingLoss } from './cooling.rules.ts'
export type { GameConfig, Tier } from './game.config.ts'
export { GAME_CONFIG } from './game.config.ts'
export type { GainResult, GainRole, GroupProgress } from './level.rules.ts'
export { addGroupGain, groupGainOf, levelCostOf, startingProgress, tierOf } from './level.rules.ts'
export type { SetMeasure, SetPlan, WindowBounds } from './points.rules.ts'
export { isInWindowAt, multiplierPercentOf, planRatioOf, setPointsOf } from './points.rules.ts'
export type { PersonalRecord, RecordSet } from './record.rules.ts'
export {
  isPersonalRecord,
  personalRecordFlags,
  personalRecordsOf,
  recordLoadGFor,
} from './record.rules.ts'
