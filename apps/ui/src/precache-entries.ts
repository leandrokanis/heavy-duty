import { randomUUID } from 'node:crypto'

// One revision per build: the workout page and the body map are client-rendered shells that change with
// each build, and without them in the precache the app cannot open in a gym without signal (FR-014).
// API responses stay out.
const revision = randomUUID()

export const precacheEntries: { url: string; revision: string }[] = [
  { url: '/~offline', revision },
  { url: '/', revision },
  { url: '/mapa', revision },
]
