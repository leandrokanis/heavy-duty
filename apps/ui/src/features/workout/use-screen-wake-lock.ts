import { useEffect } from 'react'

// The browser drops the lock when the page is hidden, so it is asked for again on return.
// Without support, or with the lock refused, the rest goes on with the screen as it is.
export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    const wakeLock = typeof navigator === 'undefined' ? undefined : navigator.wakeLock
    if (!active || wakeLock === undefined) return
    let sentinel: WakeLockSentinel | null = null
    let ended = false
    const request = () => {
      wakeLock.request('screen').then(
        (granted) => {
          sentinel = granted
          if (ended) granted.release().catch(() => {})
        },
        () => {},
      )
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sentinel?.released) request()
    }
    request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      ended = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release().catch(() => {})
    }
  }, [active])
}
