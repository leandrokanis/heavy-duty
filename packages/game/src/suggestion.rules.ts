import { GAME_CONFIG, type GameConfig } from './game.config.ts'
import type { WindowBounds } from './points.rules.ts'

export type WindowState = 'resting' | 'open' | 'cooling' | 'none'

// The state comes from the instants and the clock, so an old copy of the windows stays right.
// The window is half open, as in ADR-031: open at opensAt and already closed at closesAt.
export function windowStateAt(window: WindowBounds | undefined, nowMs: number): WindowState {
  if (!window?.opensAt || !window.closesAt) return 'none'
  if (nowMs < Date.parse(window.opensAt)) return 'resting'
  if (nowMs < Date.parse(window.closesAt)) return 'open'
  return 'cooling'
}

export type SuggestionDay = { letter: string; groupSlugs: readonly string[] }

export type SuggestionInput = {
  // In the order of the program.
  days: readonly SuggestionDay[]
  windows: Readonly<Record<string, WindowBounds>>
  levels: Readonly<Record<string, number>>
  // The letter after the last workout of the program (US-F03-01), as the API returns it.
  rotationLetter: string | null
  nowMs: number
}

function statesOf(day: SuggestionDay, input: SuggestionInput): WindowState[] {
  return [...new Set(day.groupSlugs)].map((slug) => windowStateAt(input.windows[slug], input.nowMs))
}

function isMostlyResting(states: readonly WindowState[]): boolean {
  return states.filter((state) => state === 'resting').length * 2 > states.length
}

// The letters in the order of the program sequence, from the letter it suggests.
function inRotationOrder(days: readonly SuggestionDay[], rotationLetter: string | null) {
  const start = Math.max(
    0,
    days.findIndex((day) => day.letter === rotationLetter),
  )
  return days.map((_, step) => days[(start + step) % days.length] as SuggestionDay)
}

type SuggestionConfig = Pick<GameConfig, 'suggestionWeights' | 'minLevel'>

function weakestLevelOf(day: SuggestionDay, input: SuggestionInput, config: SuggestionConfig) {
  return Math.min(...day.groupSlugs.map((slug) => input.levels[slug] ?? config.minLevel))
}

function scoreOf(states: readonly WindowState[], config: SuggestionConfig): number {
  return states.reduce((score, state) => score + config.suggestionWeights[state], 0)
}

// Decisions D39 and D69 to D71: a letter mostly resting leaves the suggestion, unless all do; the
// highest score wins, then the weakest group, then the program sequence, which alone decides
// with no window at all (US-F03-01).
export function suggestLetterByWindows(
  input: SuggestionInput,
  config: SuggestionConfig = GAME_CONFIG,
): string | null {
  const days = inRotationOrder(input.days, input.rotationLetter)
    .filter((day) => day.groupSlugs.length > 0)
    .map((day) => ({ day, states: statesOf(day, input) }))
  if (days.every(({ states }) => states.every((state) => state === 'none'))) {
    return input.rotationLetter
  }
  const ready = days.filter(({ states }) => !isMostlyResting(states))
  const ranked = (ready.length > 0 ? ready : days).map(({ day, states }) => ({
    letter: day.letter,
    score: scoreOf(states, config),
    weakestLevel: weakestLevelOf(day, input, config),
  }))
  // The sort is stable, so a tie keeps the order of the program sequence.
  ranked.sort(
    (first, second) => second.score - first.score || first.weakestLevel - second.weakestLevel,
  )
  return ranked[0]?.letter ?? input.rotationLetter
}
