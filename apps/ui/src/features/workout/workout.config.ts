// A tap inside this window after any screen change (record, rest end, skip) is ignored.
export const DOUBLE_TAP_GUARD_MS = 800

// Estimate: long enough for a slow gym network, short enough to show the failure.
export const SEND_TIMEOUT_MS = 10_000

// Estimate: a workout lasts about an hour; two hours cover long pauses without trapping the athlete in an old workout.
export const RESUME_LIMIT_MS = 2 * 60 * 60 * 1000

// The count before a timed exercise starts, in the prototype of the PO.
export const COUNTDOWN_MS = 3000

// Estimate from the prototype: one step of the wheel per 22 px of drag; to confirm on the phone.
export const DRAG_STEP_PX = 22

// The prototype wheel changes one step per 40 px of mouse wheel.
export const WHEEL_STEP_PX = 40

// Step of the phase clock: the ring stroke moves linearly over the same time (--duration-tick).
export const TICK_MS = 250

// How many times faster the rest runs while the athlete holds its ring; an estimate the PO
// chose, to check on the phone. With TICK_MS, every second of a held rest is still read.
export const REST_FAST_FORWARD_FACTOR = 3

// The full screen of a new tier or of the top level, about 1.7 s in docs/gamificacao.md; the
// animation of the same length is --duration-level-celebration.
export const LEVEL_CELEBRATION_MS = 1700
