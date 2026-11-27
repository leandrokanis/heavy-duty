import {
  COLOR,
  escapeHtml,
  type NoticeEmail,
  type NoticeEmailLinks,
  PHONE_NOTICES_GO_ON,
  unsubscribeLinksOf,
} from './email-notice.js'
import { capitalized, listOf } from './notice-format.js'
import type { WeeklyDigest } from './weekly-digest.rules.js'

const TITLE = 'Sua semana'
const DAY_MS = 24 * 60 * 60 * 1000

function countOf(count: number, one: string, many: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`
}

// "30/11", by the wall clock of the zone.
function dayMonthOf(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, day: 'numeric', month: '2-digit' }).format(ms)
}

function windowsOf(digest: WeeklyDigest): string {
  return digest.weeklyGoal === null
    ? countOf(digest.windowsUsed, 'janela', 'janelas')
    : `${digest.windowsUsed} de ${countOf(digest.weeklyGoal, 'janela', 'janelas')}`
}

export function weeklyDigestSubjectOf(digest: WeeklyDigest): string {
  return digest.weeklyGoal === null
    ? `${TITLE}: ${countOf(digest.windowsUsed, 'janela aproveitada', 'janelas aproveitadas')}`
    : `${TITLE}: ${windowsOf(digest)}`
}

type DigestLines = {
  week: string
  stats: string
  missed: string | null
  levels: string[]
  records: string | null
  medals: string | null
}

function linesOf(digest: WeeklyDigest, timeZone: string): DigestLines {
  const lastDayMs = digest.weekEndsAtMs - DAY_MS
  const records = digest.records
  return {
    week: `Semana de ${dayMonthOf(digest.weekStartsAtMs, timeZone)} a ${dayMonthOf(lastDayMs, timeZone)}`,
    stats: [
      windowsOf(digest),
      countOf(digest.weekPoints, 'ponto', 'pontos'),
      countOf(digest.weekStreak, 'semana seguida', 'semanas seguidas'),
    ].join(' · '),
    missed:
      digest.windowsMissed === 0
        ? null
        : countOf(digest.windowsMissed, 'janela perdida', 'janelas perdidas'),
    levels: digest.levels.map(({ name, from, to }) => `${capitalized(name)} ${from} → ${to}`),
    records:
      records.length === 0
        ? null
        : `${countOf(records.length, 'recorde', 'recordes')}: ${listOf(records)}`,
    medals:
      digest.medals.length === 0
        ? null
        : `${digest.medals.length === 1 ? 'Medalha nova' : 'Medalhas novas'}: ${listOf(digest.medals)}`,
  }
}

// D107: the windows, the points, the streak, the levels that changed, the records by name
// with no load and the medals of the week, with the same links as a notice (ADR-037).
export function renderWeeklyDigestEmail(
  digest: WeeklyDigest,
  links: NoticeEmailLinks,
  timeZone: string,
): NoticeEmail {
  const appUrl = `${links.appOrigin}/`
  const { pageUrl, oneClickUrl } = unsubscribeLinksOf(links)
  const lines = linesOf(digest, timeZone)
  const optional = (line: string | null) => (line === null ? [] : [line, ''])
  const text = [
    TITLE,
    lines.week,
    '',
    lines.stats,
    ...optional(lines.missed),
    ...(lines.levels.length === 0 ? [] : [...lines.levels, '']),
    ...optional(lines.records),
    ...optional(lines.medals),
    `Abrir o app: ${appUrl}`,
    '',
    '--',
    `Desligar e-mails: ${pageUrl}`,
    PHONE_NOTICES_GO_ON,
    '',
  ].join('\n')
  return {
    subject: weeklyDigestSubjectOf(digest),
    text,
    html: renderHtml(lines, appUrl, pageUrl),
    // RFC 8058: a one-click POST to this https URL turns the emails off.
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

function renderHtml(lines: DigestLines, appUrl: string, pageUrl: string): string {
  const paragraph = (line: string | null, style = '') =>
    line === null ? '' : `<p style="margin:0 0 12px;${style}">${escapeHtml(line)}</p>\n`
  const card = `padding:12px;border-radius:18px;background:${COLOR.background}`
  const levels =
    lines.levels.length === 0
      ? ''
      : `<p style="margin:0 0 12px;${card}">${lines.levels.map(escapeHtml).join('<br>')}</p>\n`
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${TITLE}</title></head>
<body style="margin:0;padding:16px;background:${COLOR.background};color:${COLOR.text};font-family:-apple-system,system-ui,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:18px 16px;border-radius:22px;background:${COLOR.card}">
<p style="margin:0 0 12px;padding-bottom:12px;border-bottom:1px solid ${COLOR.line};font-size:14px"><strong>Heavy Duty</strong></p>
<h1 style="margin:0 0 4px;font-size:22px;line-height:1.25">${TITLE}</h1>
${paragraph(lines.week, `color:${COLOR.muted};font-size:14px`)}${paragraph(lines.stats, 'font-size:18px;font-weight:600')}${paragraph(lines.missed, `color:${COLOR.muted}`)}${levels}${paragraph(lines.records, card)}${paragraph(lines.medals, card)}<p style="margin:0 0 16px;text-align:center"><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:14px 24px;border-radius:14px;background:${COLOR.accent};color:#FFFFFF;font-weight:600;text-decoration:none">Abrir o app</a></p>
<p style="margin:0;padding-top:12px;border-top:1px solid ${COLOR.line};text-align:center;font-size:13px;color:${COLOR.muted}"><a href="${escapeHtml(pageUrl)}" style="color:${COLOR.accent};font-weight:600">Desligar e-mails</a><br>${PHONE_NOTICES_GO_ON}</p>
</div>
</body>
</html>
`
}
