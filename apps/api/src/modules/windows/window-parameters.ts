import { DomainError } from '../../errors/domain-error.js'
import { GAME_PARAMETERS, type GameParameters, type Goal } from './windows.config.js'

const GOALS: Goal[] = ['strength', 'hypertrophy', 'endurance']
const MAX_PERCENT = 1000
// Bounds keep every simulated instant inside the range of Date.toISOString().
const MAX_HOURS = 24 * 365
const MAX_MINUTES_PER_KG = 600

type ByGoal = Partial<Record<Goal, number | undefined>>

export type WindowParameterOverrides = {
  secondaryVolumePercent?: number | undefined
  goalVolumePercent?: ByGoal | undefined
  baseOpenHours?: ByGoal | undefined
  openMinutesPerAdjustedKg?: number | undefined
  maxOpenHours?: number | undefined
  closeAfterHours?: ByGoal | undefined
}

function invalid(path: string): DomainError {
  return new DomainError(
    'window_parameters_invalid',
    `parâmetro da janela inválido: ${path}`,
    'invalid',
  )
}

function byGoal(base: Record<Goal, number>, overrides: ByGoal | undefined): Record<Goal, number> {
  return {
    strength: overrides?.strength ?? base.strength,
    hypertrophy: overrides?.hypertrophy ?? base.hypertrophy,
    endurance: overrides?.endurance ?? base.endurance,
  }
}

function check(value: number, path: string, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw invalid(path)
  }
}

function checkByGoal(values: Record<Goal, number>, name: string, min: number, max: number): void {
  for (const goal of GOALS) {
    check(values[goal], `${name}.${goal}`, min, max)
  }
}

export function resolveWindowParameters(
  overrides: WindowParameterOverrides | undefined,
): GameParameters {
  const parameters: GameParameters = {
    secondaryVolumePercent:
      overrides?.secondaryVolumePercent ?? GAME_PARAMETERS.secondaryVolumePercent,
    goalVolumePercent: byGoal(GAME_PARAMETERS.goalVolumePercent, overrides?.goalVolumePercent),
    baseOpenHours: byGoal(GAME_PARAMETERS.baseOpenHours, overrides?.baseOpenHours),
    openMinutesPerAdjustedKg:
      overrides?.openMinutesPerAdjustedKg ?? GAME_PARAMETERS.openMinutesPerAdjustedKg,
    maxOpenHours: overrides?.maxOpenHours ?? GAME_PARAMETERS.maxOpenHours,
    closeAfterHours: byGoal(GAME_PARAMETERS.closeAfterHours, overrides?.closeAfterHours),
  }
  check(parameters.secondaryVolumePercent, 'secondaryVolumePercent', 0, MAX_PERCENT)
  checkByGoal(parameters.goalVolumePercent, 'goalVolumePercent', 0, MAX_PERCENT)
  checkByGoal(parameters.baseOpenHours, 'baseOpenHours', 1, MAX_HOURS)
  check(parameters.openMinutesPerAdjustedKg, 'openMinutesPerAdjustedKg', 0, MAX_MINUTES_PER_KG)
  check(parameters.maxOpenHours, 'maxOpenHours', 1, MAX_HOURS)
  checkByGoal(parameters.closeAfterHours, 'closeAfterHours', 1, MAX_HOURS)
  if (GOALS.some((goal) => parameters.baseOpenHours[goal] > parameters.maxOpenHours)) {
    throw invalid('maxOpenHours')
  }
  for (const goal of GOALS) {
    if (parameters.closeAfterHours[goal] <= parameters.maxOpenHours) {
      throw invalid(`closeAfterHours.${goal}`)
    }
  }
  return parameters
}
