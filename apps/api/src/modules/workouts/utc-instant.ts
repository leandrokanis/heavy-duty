// UTC ISO 8601 with a literal Z and optional milliseconds, the shape every workout route accepts.
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

// Returns the instant as toISOString() prints it, or undefined when the text is not an
// existing UTC instant (a date such as 2026-02-30 does not roll over into March).
export function parseUtcInstant(value: string | undefined): string | undefined {
  if (value === undefined || !UTC_INSTANT.test(value)) {
    return undefined
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  const normalized = date.toISOString()
  return normalized.slice(0, 10) === value.slice(0, 10) ? normalized : undefined
}
