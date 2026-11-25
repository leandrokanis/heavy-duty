import { clockOf, dayWordOf } from './notice-time.js'
import type { Notice } from './notices.rules.js'
import type { PushMessage } from './push-sender.js'

const APP_PATH = '/'
const MIN_TTL_SECONDS = 60

// "costas, bíceps e lombar"
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
}

export function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)
}

function whenOf(notice: Notice, nowMs: number, timeZone: string): string {
  return `${dayWordOf(notice.eventAtMs, nowMs, timeZone)} às ${clockOf(notice.eventAtMs, timeZone)}`
}

// The same text goes by push and by email (US-F17-01).
export function noticeTextOf(
  notice: Notice,
  nowMs: number,
  timeZone: string,
): { title: string; body: string } {
  const names = notice.groups.map(({ name }) => name)
  const groups = capitalized(listOf(names))
  const plural = names.length > 1
  const when = whenOf(notice, nowMs, timeZone)
  if (notice.kind === 'window_open') {
    return {
      title: `Letra ${notice.letter} abre ${when}`,
      body: `${groups} ${plural ? 'entram' : 'entra'} em janela. Pontos em dobro.`,
    }
  }
  if (notice.kind === 'window_close') {
    return {
      title: `Letra ${notice.letter} fecha ${when}`,
      body: `${groups} ${plural ? 'saem' : 'sai'} da janela. Treine antes para pontos em dobro.`,
    }
  }
  const level = notice.level ?? { now: 0, after: 0 }
  const recovery = notice.letter ? ` A letra ${notice.letter} recupera em dobro.` : ''
  return {
    title: `${groups} cai para o nível ${level.after} ${when}`,
    body: `Nível ${level.now} agora.${recovery}`,
  }
}

// One tag per letter, so a newer notice of the letter replaces the older one on the phone; one per
// group on a drop.
function tagOf(notice: Notice): string {
  if (notice.kind === 'level_drop') return `drop-${notice.groups[0]?.slug ?? 'group'}`
  return `letter-${notice.letter}`
}

export function pushMessageOf(notice: Notice, nowMs: number, timeZone: string): PushMessage {
  return {
    ...noticeTextOf(notice, nowMs, timeZone),
    tag: tagOf(notice),
    url: APP_PATH,
    ttlSeconds: Math.max(MIN_TTL_SECONDS, Math.ceil((notice.eventAtMs - nowMs) / 1000)),
  }
}
