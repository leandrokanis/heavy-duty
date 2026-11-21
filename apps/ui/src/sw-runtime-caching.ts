import { defaultCache } from '@serwist/next/worker'
import { NetworkOnly, type RuntimeCaching } from 'serwist'

type MatchOptions = { url: URL; sameOrigin: boolean }

// API responses carry training data and must not outlive the access session, see ADR-019.
export function isApiRequest({ url, sameOrigin }: MatchOptions): boolean {
  return sameOrigin && url.pathname.startsWith('/api/')
}

export const runtimeCaching: RuntimeCaching[] = [
  { matcher: isApiRequest, handler: new NetworkOnly() },
  ...defaultCache,
]
