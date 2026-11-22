// A tap inside this window after any screen change (record, rest end, skip) is ignored.
export const DOUBLE_TAP_GUARD_MS = 800

// Estimate: long enough for a slow gym network, short enough to show the failure.
export const SEND_TIMEOUT_MS = 10_000

// Estimate: a workout lasts about an hour; two hours cover long pauses without trapping the athlete in an old workout.
export const RESUME_LIMIT_MS = 2 * 60 * 60 * 1000

// The count before a timed exercise starts, in the prototype of the PO.
export const COUNTDOWN_MS = 3000
