export type Goal = 'strength' | 'hypertrophy' | 'endurance'

// Starting values for the calibration; specs/plano-onda-5.md, Section 4, has the origin of each.
export const GAME_PARAMETERS = {
  // Decision D40.
  secondaryVolumePercent: 50,
  // Prototype v1, marked as illustrative.
  goalVolumePercent: { strength: 130, hypertrophy: 100, endurance: 75 },
  // Decision of the PO, from the literature on muscle recovery.
  baseOpenHours: { strength: 24, hypertrophy: 24, endurance: 24 },
  // Prototype v1: one hour for each 60 kg of adjusted volume.
  openMinutesPerAdjustedKg: 1,
  // Estimate: without a cap, 11 t of leg volume would open after 9 days.
  maxOpenHours: 72,
  // Decision of the PO: the window closes a fixed time after the training, whatever the volume.
  closeAfterHours: { strength: 120, hypertrophy: 120, endurance: 120 },
}

export type GameParameters = typeof GAME_PARAMETERS
