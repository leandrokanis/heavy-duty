import { test as base } from './auth-fixtures.js'

export type EmailOptOutState = {
  token: string
  response?: Response
}

export const test = base.extend<{ emailOptOut: EmailOptOutState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  emailOptOut: async ({}, use) => {
    await use({ token: '' })
  },
})
