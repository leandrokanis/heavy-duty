@US-F17-03
Feature: Weekly digest by email

  # With no SMTP server in the e2e, the content of the digest is checked through MCP (ADR-041).
  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
    And no workout is recorded
    And no medal is awarded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
    And the current period started 8 days ago

  Scenario: Weekly digest
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 190 hours ago
    And 3 sets of "Supino reto" of 10 reps with "42,5 kg" are recorded 140 hours ago
    And the medals of the history are recorded
    When the week ends and the planner reads the weekly digest through MCP
    Then the digest of the week that ended should show the windows used, the record of "Supino reto" and the medals "Primeiro recorde" and "Primeira janela"
