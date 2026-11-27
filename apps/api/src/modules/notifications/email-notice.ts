import { capitalized, noticeTextOf } from './notice-format.js'
import type { Notice } from './notices.rules.js'

export type NoticeEmailContent = {
  title: string
  body: string
  letter: string | null
  groups: readonly string[]
  // Only on a level drop: the level now and the level after the drop.
  levels: { now: number; after: number } | null
}

export type NoticeEmailLinks = {
  appOrigin: string
  unsubscribeToken: string
}

export type NoticeEmail = {
  subject: string
  text: string
  html: string
  headers: Record<string, string>
}

export const PHONE_NOTICES_GO_ON = 'Os avisos no celular continuam.'

// Colors of the light theme of the prototype v1; email clients ignore CSS variables.
export const COLOR = {
  text: '#12151C',
  muted: '#596173',
  line: '#D8DCE4',
  accent: '#2F55E4',
  background: '#F2F3F7',
  card: '#FFFFFF',
} as const

// The email reuses the text of the notice, so both channels say the same (ADR-037).
export function noticeEmailContentOf(
  notice: Notice,
  nowMs: number,
  timeZone: string,
): NoticeEmailContent {
  return {
    ...noticeTextOf(notice, nowMs, timeZone),
    letter: notice.letter,
    groups: notice.groups.map(({ name }) => capitalized(name)),
    levels: notice.level ?? null,
  }
}

export function unsubscribeLinksOf(links: NoticeEmailLinks): {
  pageUrl: string
  oneClickUrl: string
} {
  const token = encodeURIComponent(links.unsubscribeToken)
  return {
    // The fragment keeps the token out of the web server log, as in /cadastro#token=.
    pageUrl: `${links.appOrigin}/desligar-emails#token=${token}`,
    oneClickUrl: `${links.appOrigin}/api/email/unsubscribe?token=${token}`,
  }
}

export function renderNoticeEmail(
  content: NoticeEmailContent,
  links: NoticeEmailLinks,
): NoticeEmail {
  const appUrl = `${links.appOrigin}/`
  const { pageUrl, oneClickUrl } = unsubscribeLinksOf(links)
  const letterLine = content.letter === null ? null : `Letra ${content.letter}`
  const levelLine = content.levels === null ? null : levelLineOf(content.levels)

  const text = [
    content.title,
    '',
    content.groups.join(' · '),
    '',
    ...(levelLine === null ? [] : [levelLine]),
    ...(letterLine === null ? [] : [letterLine]),
    content.body,
    '',
    `Abrir o app: ${appUrl}`,
    '',
    '--',
    `Desligar e-mails: ${pageUrl}`,
    PHONE_NOTICES_GO_ON,
    '',
  ].join('\n')

  return {
    subject: content.title,
    text,
    html: renderHtml(content, { letterLine, levelLine }, appUrl, pageUrl),
    // RFC 8058: a one-click POST to this https URL turns the emails off.
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

function levelLineOf(levels: { now: number; after: number }): string {
  return `Nível ${levels.now} → ${levels.after}`
}

function renderHtml(
  content: NoticeEmailContent,
  { letterLine, levelLine }: { letterLine: string | null; levelLine: string | null },
  appUrl: string,
  pageUrl: string,
): string {
  const groups = content.groups
    .map(
      (group) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:999px;background:${COLOR.background}">${escapeHtml(group)}</span>`,
    )
    .join('')
  const letter = letterLine === null ? '' : `<strong>${escapeHtml(letterLine)}</strong><br>`
  const level =
    levelLine === null
      ? ''
      : `<p style="margin:0 0 10px;font-size:18px;font-weight:600">${escapeHtml(levelLine)}</p>\n`

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(content.title)}</title></head>
<body style="margin:0;padding:16px;background:${COLOR.background};color:${COLOR.text};font-family:-apple-system,system-ui,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:18px 16px;border-radius:22px;background:${COLOR.card}">
<p style="margin:0 0 12px;padding-bottom:12px;border-bottom:1px solid ${COLOR.line};font-size:14px"><strong>Heavy Duty</strong></p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25">${escapeHtml(content.title)}</h1>
<p style="margin:0 0 10px">${groups}</p>
${level}<p style="margin:0 0 16px;padding:12px;border-radius:18px;background:${COLOR.background}">${letter}<span style="color:${COLOR.muted};font-size:14px">${escapeHtml(content.body)}</span></p>
<p style="margin:0 0 16px;text-align:center"><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:14px 24px;border-radius:14px;background:${COLOR.accent};color:#FFFFFF;font-weight:600;text-decoration:none">Abrir o app</a></p>
<p style="margin:0;padding-top:12px;border-top:1px solid ${COLOR.line};text-align:center;font-size:13px;color:${COLOR.muted}"><a href="${escapeHtml(pageUrl)}" style="color:${COLOR.accent};font-weight:600">Desligar e-mails</a><br>${PHONE_NOTICES_GO_ON}</p>
</div>
</body>
</html>
`
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
