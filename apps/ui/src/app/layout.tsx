import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AuthGate } from '@/features/auth/auth-gate'
import './globals.css'

export const metadata: Metadata = {
  title: 'Heavy Duty',
  description: 'Registro de treino de musculação',
  applicationName: 'Heavy Duty',
  appleWebApp: { capable: true, title: 'Heavy Duty', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

// DESIGN.md, Section 5.1: viewport-fit=cover with safe-area insets.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  )
}
