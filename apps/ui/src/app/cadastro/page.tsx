import type { Metadata } from 'next'
import { EnrollmentScreen } from '@/features/auth/enrollment-screen'

export const metadata: Metadata = {
  title: 'Cadastro da chave de acesso · Heavy Duty',
  referrer: 'no-referrer',
}

export default function EnrollmentPage() {
  return <EnrollmentScreen />
}
