@US-F05-01
Feature: Rest that counts down on its own and a "Próximo" that skips it

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | tríceps braquial | triceps |
    And these exercises are registered:
      | exercise         | kind | primary          |
      | Supino reto      | reps | peitoral maior   |
      | Tríceps na polia | reps | tríceps braquial |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino reto      | 3    | 10 reps | 40 kg | 90   |
      | Tríceps na polia | 3    | 12 reps | 20 kg | 60   |

  Scenario: rest ends
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the clock reaches "2026-11-21T18:32:35.000Z"
    Then the screen should show "Supino reto" with "40" kg, "10" rep and set "2 de 3"
    When the athlete taps "Próximo" at "2026-11-21T18:32:36.000Z"
    Then the workout should hold the set numbers "1, 2"

  Scenario: athlete skips the rest
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the athlete skips the rest with "Próximo" at "2026-11-21T18:31:06.000Z"
    Then the screen should show "Supino reto" with "40" kg, "10" rep and set "2 de 3"
    And only one set should be recorded in the workout

  Scenario: end of the exercise
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:06.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:07.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:08.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:09.000Z"
    When the clock reaches "2026-11-21T18:32:39.000Z"
    Then the screen should show "Tríceps na polia" with "20" kg, "12" rep and set "1 de 3"
    And the exercises should show "2 de 2"

  Scenario: last set of the day ends the workout
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Tríceps na polia | 1    | 12 reps | 20 kg | 60   |
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the set of "Tríceps na polia" should be recorded with load 20000 g, 12 reps and set number 1 in the workout of the day "A"
    And the screen should show the heading "Treino concluído" with no rest and no dialog
