@US-F07-01
Feature: State of the activity window by muscle group through MCP

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | tríceps braquial | triceps |
    And these exercises are registered with secondary muscles:
      | exercise      | kind | primary        | secondary        |
      | Supino pesado | reps | peitoral maior | tríceps braquial |
    And no workout is recorded
    And a program with goal "hypertrophy"

  Scenario: Group resting
    Given 3 sets of "Supino pesado" of 10 reps with "40 kg" are recorded 1 hour ago
    When the planner lists the activity windows through MCP
    Then the group "chest" should be "resting"
    And the window of "chest" should open after now

  Scenario: Group never trained
    When the planner lists the activity windows through MCP
    Then the group "calves" should be "none" with no instants
