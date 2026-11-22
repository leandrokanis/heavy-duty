export type Goal = 'strength' | 'hypertrophy' | 'endurance'

// Starting values for the calibration; specs/plano-onda-5.md, Section 4, has the origin of each.
export const GAME_PARAMETERS = {
  // Decision D40.
  secondaryVolumePercent: 50,
  // Prototype v1, marked as illustrative.
  goalVolumePercent: { strength: 130, hypertrophy: 100, endurance: 75 },
  // Prototype v1.
  baseOpenHours: { strength: 40, hypertrophy: 40, endurance: 40 },
  // Prototype v1: one hour for each 60 kg of adjusted volume.
  openMinutesPerAdjustedKg: 1,
  // Estimate: without a cap, 11 t of leg volume would open after 9 days.
  maxOpenHours: 72,
  // Estimate: the prototype has no open duration.
  openDurationHours: { strength: 48, hypertrophy: 48, endurance: 48 },
}

export type GameParameters = typeof GAME_PARAMETERS
