export type PushNotice = {
  title: string
  options: { body: string; tag: string; icon: string; data: { url: string } }
}

const APP_PATH = '/'
const ICON = '/icons/icon-192.png'

const FALLBACK_NOTICE: PushNotice = {
  title: 'Heavy Duty',
  options: {
    body: 'Abra o app para ver o aviso.',
    tag: 'heavy-duty',
    icon: ICON,
    data: { url: APP_PATH },
  },
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

// Only a path of the app opens, so a message never sends the athlete to another site.
export function appPathOf(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : APP_PATH
}

// Safari revokes the permission when a push shows nothing, so bad data still shows a notice (ADR-035).
export function noticeOf(data: unknown): PushNotice {
  if (typeof data !== 'object' || data === null) return FALLBACK_NOTICE
  const fields = data as Record<string, unknown>
  const title = textOf(fields.title)
  if (title === null) return FALLBACK_NOTICE
  return {
    title,
    options: {
      body: textOf(fields.body) ?? '',
      tag: textOf(fields.tag) ?? FALLBACK_NOTICE.options.tag,
      icon: ICON,
      data: { url: appPathOf(fields.url) },
    },
  }
}

type AppWindow = { focus: () => Promise<unknown>; navigate: (url: string) => Promise<unknown> }

type AppClients = {
  matchAll: (options: {
    type: 'window'
    includeUncontrolled: boolean
  }) => Promise<readonly AppWindow[]>
  openWindow: (url: string) => Promise<unknown>
}

export async function openApp(clients: AppClients, path: string): Promise<void> {
  const [open] = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (!open) {
    await clients.openWindow(path)
    return
  }
  try {
    await open.navigate(path)
  } catch {
    // A window the worker does not control refuses to navigate; focusing it still opens the app.
  }
  await open.focus()
}
