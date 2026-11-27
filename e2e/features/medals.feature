@US-F19-01
Feature: Medals

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
    And the current period started 2 days ago

  Scenario: Medal conquered
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 10 minutes ago
    And the athlete started the day "A" on the real clock
    When the athlete drags the wheel "Carga" 1 steps up
    And the athlete records the set
    Then the medal "Primeiro recorde" should drop from the top of the screen
    And the shelf of medals should show "Primeiro recorde, conquistada"

  Scenario: Hidden medal
    When the athlete opens the period from the tab bar
    Then the shelf of medals should show 2 hidden medals with no name and no criterion

  Scenario: Medal never lost
    Given the athlete conquered the medal "level_10" in "chest"
    When the athlete opens the period from the tab bar
    Then the level of "Peito" should be below 10
    And the shelf of medals should show "Nível 10 · Peito, conquistada"
