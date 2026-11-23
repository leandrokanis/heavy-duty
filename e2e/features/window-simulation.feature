@EN01-01
Feature: Activity window simulation through MCP

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

  Scenario: Windows of the history with the parameters in use
    When the planner simulates the windows of "back" through MCP
    Then the training of "2025-09-01T10:00:00.000Z" should open its window at "2025-09-03T06:00:00.000Z" and close it at "2025-09-06T10:00:00.000Z"
    And the training of "2025-09-04T10:00:00.000Z" should have the relation "in_window"

  Scenario: Simulation with other parameters
    When the planner simulates the windows of "back" with 30 base hours for hypertrophy through MCP
    Then the training of "2025-09-01T10:00:00.000Z" should open its window at "2025-09-03T12:00:00.000Z" and close it at "2025-09-06T10:00:00.000Z"
    And the simulated base hours for hypertrophy should be 30
    When the planner simulates the windows of "back" through MCP
    Then the training of "2025-09-01T10:00:00.000Z" should open its window at "2025-09-03T06:00:00.000Z" and close it at "2025-09-06T10:00:00.000Z"
