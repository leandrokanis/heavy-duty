import { randomUUID } from 'node:crypto'

// One revision per build: the workout page is a client-rendered shell that changes with each build, and
// without it in the precache the app cannot open in a gym without signal (FR-014). API responses stay out.
const revision = randomUUID()

export const precacheEntries: { url: string; revision: string }[] = [
  { url: '/~offline', revision },
  { url: '/', revision },
]
