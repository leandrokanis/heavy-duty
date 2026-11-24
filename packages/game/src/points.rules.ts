import { GAME_CONFIG, type GameConfig } from './game.config.ts'

// What the set did; reps or seconds is null for the other kind of exercise.
export type SetMeasure = { loadG: number; reps: number | null; seconds: number | null }

// The plan frozen in the set when it was recorded (ADR-033).
export type SetPlan = {
  plannedLoadG: number
  targetReps: number | null
  targetSeconds: number | null
}

type Volumes = { doneVolume: number; plannedVolume: number }

// Decision D57: load × reps, the reps alone with a planned load of 0, the seconds of a timed set.
// A set with no plan, or a plan of the other kind, counts as meeting the plan (ADR-033).
function volumesOf(done: SetMeasure, plan: SetPlan | null): Volumes | null {
  if (plan === null) return null
  if (plan.targetSeconds !== null) {
    return done.seconds === null
      ? null
      : { doneVolume: done.seconds, plannedVolume: plan.targetSeconds }
  }
  if (plan.targetReps === null || done.reps === null) return null
  if (plan.plannedLoadG === 0) return { doneVolume: done.reps, plannedVolume: plan.targetReps }
  return {
    doneVolume: done.loadG * done.reps,
    plannedVolume: plan.plannedLoadG * plan.targetReps,
  }
}

// The done ÷ planned ratio as a fraction of integers, capped at maxPlanPercent: the ratio is
// cappedVolume ÷ (plannedVolume × 100). A set with no plan counts as meeting it.
export function planRatioOf(
  done: SetMeasure,
  plan: SetPlan | null,
  config: Pick<GameConfig, 'maxPlanPercent'> = GAME_CONFIG,
): { cappedVolume: number; plannedVolume: number } {
  const volumes = volumesOf(done, plan) ?? { doneVolume: 1, plannedVolume: 1 }
  return {
    cappedVolume: Math.min(volumes.doneVolume * 100, volumes.plannedVolume * config.maxPlanPercent),
    plannedVolume: volumes.plannedVolume,
  }
}

type PointsConfig = Pick<GameConfig, 'setPointsAtPlan' | 'maxPlanPercent'>

// Decision D41: the points at plan times the done ÷ planned ratio, up to the double, times the
// multiplier. Only integers until the single division, so the API and the phone round alike.
export function setPointsOf(
  done: SetMeasure,
  plan: SetPlan | null,
  multiplierPercent: number,
  config: PointsConfig = GAME_CONFIG,
): number {
  const { cappedVolume, plannedVolume } = planRatioOf(done, plan, config)
  return Math.round(
    (config.setPointsAtPlan * cappedVolume * multiplierPercent) / (plannedVolume * 100 * 100),
  )
}

type MultiplierConfig = Pick<
  GameConfig,
  'windowPercent' | 'outsideWindowPercent' | 'welcomeBackPercent' | 'maxMultiplierPercent'
>

// Decisions D41, D52 and D53: the double inside the window and in the first training after the
// group cooled, the common points otherwise; the bonuses never stack beyond the maximum.
export function multiplierPercentOf(
  bonuses: { inWindow: boolean; welcomeBack?: boolean },
  config: MultiplierConfig = GAME_CONFIG,
): number {
  const percents = [
    config.outsideWindowPercent,
    bonuses.inWindow ? config.windowPercent : 0,
    bonuses.welcomeBack ? config.welcomeBackPercent : 0,
  ]
  return Math.min(Math.max(...percents), config.maxMultiplierPercent)
}

export type WindowBounds = { opensAt: string | null; closesAt: string | null }

// The window is half open, as in ADR-031: open at opensAt and already closed at closesAt.
export function isInWindowAt(window: WindowBounds, instantMs: number): boolean {
  if (window.opensAt === null || window.closesAt === null) return false
  return Date.parse(window.opensAt) <= instantMs && instantMs < Date.parse(window.closesAt)
}
