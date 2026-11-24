@US-F15b-01
Feature: Activity windows used in each week through MCP

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | grande dorsal  | back  |
    And these exercises are registered with secondary muscles:
      | exercise      | kind | primary       | secondary |
      | Remada pesada | reps | grande dorsal |           |
    And no workout is recorded
    And a program with goal "hypertrophy"
    And 3 sets of "Remada pesada" of 10 reps with "40 kg" are recorded on "2025-09-01T10:00:00.000Z"
    And 3 sets of "Remada pesada" of 10 reps with "40 kg" are recorded on "2025-09-04T10:00:00.000Z"

  Scenario: Windows used in the week
    When the planner gets the windows used from "2025-09-01T03:00:00.000Z" to "2025-09-08T03:00:00.000Z" through MCP
    Then the week from "2025-09-01T03:00:00.000Z" should show 1 of 1 windows used, or 100%

  Scenario: Week with no window
    When the planner gets the windows used from "2025-08-04T03:00:00.000Z" to "2025-08-11T03:00:00.000Z" through MCP
    Then the week from "2025-08-04T03:00:00.000Z" should show 0 of 0 windows used, with no percent
