@US-F10-04
Feature: Muscle memory and best level

  Background:
    Given these muscles are registered:
      | muscle       | group      |
      | reto femoral | quadriceps |
    And these exercises are registered:
      | exercise          | kind | primary      |
      | Agachamento livre | reps | reto femoral |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise          | sets | target  | load  | rest |
      | Agachamento livre | 3    | 10 reps | 40 kg | 90   |
    And 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 200 hours ago
    And 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 150 hours ago

  Scenario: best level is never lost
    When the planner lists the muscle group levels through MCP
    Then the group "quadriceps" should be at level 4 with best level 5 and muscle memory

  Scenario: muscle memory
    Given the athlete started the day "A" on the real clock
    When the athlete taps "Próximo" on the screen
    Then "+20" should rise from "Próximo" with the mark "↺ ×2"
    And the screen should announce "Série 1 de 3 registrada, 20 pontos em dobro pela memória muscular"
