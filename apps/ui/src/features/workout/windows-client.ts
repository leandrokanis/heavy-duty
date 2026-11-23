import type { ActivityWindows } from './windows.types'

export type WindowsResult =
  | { status: 'ok'; windows: ActivityWindows }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

const WINDOWS_PATH = '/api/windows'

export async function fetchWindows(): Promise<WindowsResult> {
  try {
    const response = await fetch(WINDOWS_PATH, { credentials: 'same-origin' })
    if (response.status === 200) {
      return { status: 'ok', windows: (await response.json()) as ActivityWindows }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}
