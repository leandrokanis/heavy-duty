export type BackupStage = 'snapshot failed' | 'offsite copy failed' | 'run not recorded'

export const MAX_FAILURE_REASON_LENGTH = 500

const REDACTED = '***'
const ELLIPSIS = '…'
// biome-ignore lint/suspicious/noControlCharactersInRegex: strips terminal control characters.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g
const URL_CREDENTIALS = /:\/\/[^/\s@]+@/g

export function toFailureReason(
  stage: BackupStage,
  detail: string,
  secrets: readonly string[],
): string {
  const line = lastNonEmptyLine(detail)
  const safe = redact(line.replace(CONTROL_CHARACTERS, ' ').trim(), secrets)
  const reason = safe ? `${stage}: ${safe}` : stage
  if (reason.length <= MAX_FAILURE_REASON_LENGTH) return reason
  // The tool states the cause at the end of its line, so the tail is kept.
  const head = `${stage}: ${ELLIPSIS}`
  return head + safe.slice(safe.length - (MAX_FAILURE_REASON_LENGTH - head.length))
}

function lastNonEmptyLine(detail: string): string {
  const lines = detail.split(/\r?\n/).filter((line) => line.trim().length > 0)
  return lines.at(-1) ?? ''
}

function redact(text: string, secrets: readonly string[]): string {
  let redacted = text.replace(URL_CREDENTIALS, `://${REDACTED}@`)
  for (const secret of secrets) {
    if (secret.length > 0) redacted = redacted.split(secret).join(REDACTED)
  }
  return redacted
}
