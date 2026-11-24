export { coolingLossOf, nextDropAtMsOf, subtractCoolingLoss } from './cooling.rules.ts'
export type { GameConfig, Tier } from './game.config.ts'
export { GAME_CONFIG } from './game.config.ts'
export type { GainResult, GainRole, GroupProgress } from './level.rules.ts'
export {
  addGroupGain,
  groupGainOf,
  hasMuscleMemory,
  levelCostOf,
  startingProgress,
  tierOf,
} from './level.rules.ts'
export type { OverallLevel, PlannedDay } from './overall-level.rules.ts'
export { letterForGroupOf, overallLevelOf } from './overall-level.rules.ts'
export type { SetBonuses, SetMeasure, SetPlan, WindowBounds } from './points.rules.ts'
export { isInWindowAt, multiplierPercentOf, planRatioOf, setPointsOf } from './points.rules.ts'
export type { PersonalRecord, RecordSet } from './record.rules.ts'
export {
  isPersonalRecord,
  personalRecordFlags,
  personalRecordsOf,
  recordLoadGFor,
} from './record.rules.ts'
export type { SuggestionDay, SuggestionInput, WindowState } from './suggestion.rules.ts'
export { suggestLetterByWindows, windowStateAt } from './suggestion.rules.ts'
