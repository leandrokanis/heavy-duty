import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthorizationScreen } from '@/features/mcp-auth/authorization-screen'

export const metadata: Metadata = {
  title: 'Autorizar acesso ao MCP · Heavy Duty',
  referrer: 'no-referrer',
}

// useSearchParams needs a Suspense boundary to prerender, see the Next.js App Router docs.
export default function AuthorizationPage() {
  return (
    <Suspense fallback={<main aria-busy="true" className="flex-1" />}>
      <AuthorizationScreen />
    </Suspense>
  )
}
