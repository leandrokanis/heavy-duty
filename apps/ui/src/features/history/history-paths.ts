export const HISTORY_PATH = '/historico'

export const WORKOUT_PARAM = 'treino'

export function workoutDetailHref(workoutId: string): string {
  return `${HISTORY_PATH}?${new URLSearchParams({ [WORKOUT_PARAM]: workoutId })}`
}
