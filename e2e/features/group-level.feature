@US-F10-02
Feature: Level of each muscle group on the phone

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |

  Scenario: level bar in the rest
    Given the athlete started the day "A" on the real clock
    When the athlete taps "Próximo" on the screen
    Then the level bar of "peito" should read "Nível 1, 20 de 40 pontos"

  Scenario: level up
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 2 hours ago
    And the athlete started the day "A" on the real clock
    When the athlete records 2 sets skipping the rest
    Then the level bar of "peito" should read "Nível 3, 17 de 46 pontos"
    And the screen should announce "Série 2 de 3 registrada, 10 pontos. Peito subiu para o nível 3"

  Scenario: entering a tier
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 70 hours ago
    And 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 50 hours ago
    And the athlete started the day "A" on the real clock
    When the athlete records 2 sets skipping the rest
    Then the silver seal of level 5 should show in full screen and leave by itself
    And the level bar of "peito" should read "Nível 5, 22 de 52 pontos"

  Scenario: reduced motion
    Given the phone asks for reduced motion
    And 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 2 hours ago
    And the athlete started the day "A" on the real clock
    When the athlete records 2 sets skipping the rest
    Then the level bar of "peito" should fill with no animation

  Scenario: level on the workout of the day
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 50 hours ago
    When the athlete opens the app
    Then the day "A" should show these windows:
      | window                   |
      | Peito · fecha .*, nível 2 |
