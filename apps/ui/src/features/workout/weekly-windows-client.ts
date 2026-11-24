import type { WeekWindows } from './weekly-windows.types'

export type WeekWindowsResult =
  | { status: 'ok'; week: WeekWindows }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

const WEEK_WINDOWS_PATH = '/api/windows/week'

export async function fetchWeekWindows(fromIso: string): Promise<WeekWindowsResult> {
  try {
    const response = await fetch(`${WEEK_WINDOWS_PATH}?from=${encodeURIComponent(fromIso)}`, {
      credentials: 'same-origin',
    })
    if (response.status === 200) {
      return { status: 'ok', week: (await response.json()) as WeekWindows }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}
