// Parameters of the notices, versioned as the other game parameters (ADR-010, ADR-036).
export const NOTICE_CONFIG = {
  // D79: how long before the event each notice goes out.
  leadHours: { window_open: 12, window_close: 12, level_drop: 24 },
  // D83: the close notice lists the groups of the letter that close up to this long after the first.
  closeSpanHours: 24,
  // D80: no notice from 22h to 7h; one due inside goes out at the 21h before.
  quietHours: { startHour: 22, endHour: 7, sendHour: 21 },
  // D106: on the day the week ends, at this hour; a server back from a stop
  // still sends it up to catchUpHours after.
  weeklyDigest: { sendHour: 7, catchUpHours: 24 },
} as const

export type NoticeConfig = typeof NOTICE_CONFIG
export type NoticeKind = keyof NoticeConfig['leadHours']
