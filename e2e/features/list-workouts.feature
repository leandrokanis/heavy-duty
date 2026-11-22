@US-F06-01
Feature: List the workouts of an interval through MCP

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
    And no workout is recorded

  Scenario: Range query
    Given a program with the days "A, B, C", each with "Supino reto" at "40 kg"
    And these workouts are recorded, one set of "Supino reto" of 10 reps each:
      | day | started                  | load    |
      | A   | 2025-03-03T03:00:00.000Z | 40 kg   |
      | B   | 2025-03-05T12:00:00.000Z | 42,5 kg |
      | C   | 2025-03-09T20:00:00.000Z | 45 kg   |
      | A   | 2025-03-02T12:00:00.000Z | 35 kg   |
      | B   | 2025-03-10T03:00:00.000Z | 50 kg   |
      | C   | 2025-03-12T12:00:00.000Z | 55 kg   |
    When the planner lists the workouts from "2025-03-03T03:00:00.000Z" to "2025-03-10T03:00:00.000Z" through MCP
    Then the listed workouts should be, oldest first:
      | day | exercise    | sets | load    |
      | A   | Supino reto | 1    | 40 kg   |
      | B   | Supino reto | 1    | 42,5 kg |
      | C   | Supino reto | 1    | 45 kg   |
