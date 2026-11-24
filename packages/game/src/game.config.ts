export type Tier = 'bronze' | 'silver' | 'gold' | 'violet'

// Starting values for the calibration, see docs/gamificacao.md and ADR-034; the PRD records
// each decision in Section 10.
export const GAME_CONFIG = {
  // Decision D41: the set that meets the plan.
  setPointsAtPlan: 10,
  // Decision D41: a set counts up to twice the planned volume.
  maxPlanPercent: 200,
  // Decision D41: points double with a group of the exercise in its window.
  windowPercent: 200,
  // Decision D52: outside the window a set yields the common points.
  outsideWindowPercent: 100,
  // Decisions D41 and D53: multipliers never stack beyond the double.
  maxMultiplierPercent: 200,
  // Decisions D28 and D54: each group gets about 60 points per complete workout.
  groupPointsPerWorkout: 60,
  // Decision D54: a secondary group gets half of the set points.
  secondaryGainPercent: 50,
  // Decision D41: level n costs 40 + 3 × (n − 1) points.
  levelBaseCost: 40,
  levelCostStep: 3,
  minLevel: 1,
  maxLevel: 20,
  // Glossary, "Faixa": the first level of each tier.
  tierStartLevels: { bronze: 1, silver: 5, gold: 11, violet: 17 } satisfies Record<Tier, number>,
  // Decision D43: a cooling group loses about 40 points per day.
  coolingPointsPerDay: 40,
}

export type GameConfig = typeof GAME_CONFIG
