@US-F10-02
Feature: Level of each muscle group through MCP

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

  Scenario: Primary and secondary groups rise with the sets
    Given 3 sets of "Supino pesado" of 10 reps with "40 kg" are recorded 1 hour ago
    When the planner lists the muscle group levels through MCP
    Then the group "chest" should be at level 2 with 20 of 43 points, tier "bronze"
    And the group "triceps" should be at level 1 with 15 of 40 points, tier "bronze"

  Scenario: Group never trained
    When the planner lists the muscle group levels through MCP
    Then the group "calves" should be at level 1 with 0 of 40 points, tier "bronze"
