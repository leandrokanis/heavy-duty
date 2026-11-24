export type { GameConfig, Tier } from './game.config.ts'
export { GAME_CONFIG } from './game.config.ts'
export type { SetMeasure, SetPlan, WindowBounds } from './points.rules.ts'
export { isInWindowAt, multiplierPercentOf, setPointsOf } from './points.rules.ts'
export type { PersonalRecord, RecordSet } from './record.rules.ts'
export {
  isPersonalRecord,
  personalRecordFlags,
  personalRecordsOf,
  recordLoadGFor,
} from './record.rules.ts'
