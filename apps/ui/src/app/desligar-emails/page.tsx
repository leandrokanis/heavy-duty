import type { Metadata } from 'next'
import { EmailOptOutScreen } from '@/features/email-opt-out/email-opt-out-screen'

export const metadata: Metadata = {
  title: 'Desligar e-mails · Heavy Duty',
  referrer: 'no-referrer',
}

export default function EmailOptOutPage() {
  return <EmailOptOutScreen />
}
