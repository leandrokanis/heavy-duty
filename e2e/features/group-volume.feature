@US-F15a-01
Feature: Weekly volume by muscle group through MCP

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | tríceps braquial | triceps |
      | grande dorsal    | back    |
      | reto abdominal   | abs     |
    And these exercises are registered with secondary muscles:
      | exercise        | kind | primary          | secondary        |
      | Supino pesado   | reps | peitoral maior   | tríceps braquial |
      | Remada pesada   | reps | grande dorsal    |                  |
      | Prancha pesada  | time | reto abdominal   |                  |
    And no workout is recorded
    And a program with goal "hypertrophy"

  Scenario: Volume of the week by group
    Given 3 sets of "Supino pesado" of 10 reps with "40 kg" are recorded on "2025-06-04T12:00:00.000Z"
    When the planner asks for the muscle group volume from "2025-06-02T03:00:00.000Z" to "2025-06-09T03:00:00.000Z" through MCP
    Then the group "chest" should have a volume of "1200 kg"
    And the group "triceps" should have a volume of "600 kg"

  Scenario: Comparison with the previous week
    Given 4 sets of "Remada pesada" of 10 reps with "50 kg" are recorded on "2025-05-28T12:00:00.000Z"
    And 3 sets of "Remada pesada" of 10 reps with "80 kg" are recorded on "2025-06-04T12:00:00.000Z"
    When the planner asks for the muscle group volume from "2025-06-02T03:00:00.000Z" to "2025-06-09T03:00:00.000Z" through MCP
    Then the group "back" should have a previous volume of "2000 kg" and a change of 20 percent

  Scenario: Timed exercise
    Given 3 sets of "Prancha pesada" of 45 seconds are recorded on "2025-06-04T12:00:00.000Z"
    When the planner asks for the muscle group volume from "2025-06-02T03:00:00.000Z" to "2025-06-09T03:00:00.000Z" through MCP
    Then the group "abs" should have 135 seconds and no volume
