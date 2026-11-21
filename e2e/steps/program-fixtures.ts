import type { APIResponse } from '@playwright/test'
import { test as base } from './catalog-fixtures.js'

export type ProgramState = {
  programId?: string
  letter?: string
  programIdsByName: Record<string, string>
  lastResponse?: APIResponse
  fetchedProgram?: APIResponse
  workoutId?: string
}

export const test = base.extend<{ program: ProgramState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  program: async ({}, use) => {
    await use({ programIdsByName: {} })
  },
})

export function programIdOf(program: ProgramState): string {
  if (!program.programId) {
    throw new Error('No program was created by a previous step')
  }
  return program.programId
}

export function lastProgramResponseOf(program: ProgramState): APIResponse {
  if (!program.lastResponse) {
    throw new Error('No program API response was recorded by a previous step')
  }
  return program.lastResponse
}

export function letterOf(program: ProgramState): string {
  if (!program.letter) {
    throw new Error('No day was added by a previous step')
  }
  return program.letter
}

export function workoutIdOf(program: ProgramState): string {
  if (!program.workoutId) {
    throw new Error('No workout was recorded by a previous step')
  }
  return program.workoutId
}
