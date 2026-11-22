import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { simulationResponseOf, test } from './window-simulation-fixtures.js'

const { When, Then } = createBdd(test)

type Simulation = {
  parameters: { baseOpenHours: { hypertrophy: number } }
  groups: {
    muscleGroup: { slug: string }
    trainings: {
      trainedAt: string
      relation: string
      window: { opensAt: string; closesAt: string }
    }[]
  }[]
}

When(
  'the planner simulates the windows of {string} through MCP',
  async ({ request, windowSimulation }, slug: string) => {
    windowSimulation.response = await callMcpTool(request, 'simulate_activity_windows', {
      muscleGroupSlug: slug,
    })
  },
)

When(
  'the planner simulates the windows of {string} with {int} base hours for hypertrophy through MCP',
  async ({ request, windowSimulation }, slug: string, hours: number) => {
    windowSimulation.response = await callMcpTool(request, 'simulate_activity_windows', {
      muscleGroupSlug: slug,
      parameters: { baseOpenHours: { hypertrophy: hours } },
    })
  },
)

async function simulationOf(state: Parameters<typeof simulationResponseOf>[0]) {
  const body = (await simulationResponseOf(state).json()) as {
    result?: { isError?: boolean; structuredContent?: Simulation }
  }
  expect(body.result?.isError).toBeFalsy()
  return body.result?.structuredContent as Simulation
}

async function trainingOf(state: Parameters<typeof simulationResponseOf>[0], trainedAt: string) {
  const simulation = await simulationOf(state)
  const training = simulation.groups
    .flatMap(({ trainings }) => trainings)
    .find((row) => row.trainedAt === trainedAt)
  expect(training).toBeDefined()
  return training as Simulation['groups'][number]['trainings'][number]
}

Then(
  'the training of {string} should open its window at {string} and close it at {string}',
  async ({ windowSimulation }, trainedAt: string, opensAt: string, closesAt: string) => {
    const training = await trainingOf(windowSimulation, trainedAt)

    expect(training.window).toMatchObject({ opensAt, closesAt })
  },
)

Then(
  'the training of {string} should have the relation {string}',
  async ({ windowSimulation }, trainedAt: string, relation: string) => {
    const training = await trainingOf(windowSimulation, trainedAt)

    expect(training.relation).toBe(relation)
  },
)

Then(
  'the simulated base hours for hypertrophy should be {int}',
  async ({ windowSimulation }, hours: number) => {
    const simulation = await simulationOf(windowSimulation)

    expect(simulation.parameters.baseOpenHours.hypertrophy).toBe(hours)
  },
)
