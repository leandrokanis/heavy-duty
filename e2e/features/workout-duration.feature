@US-F03-08
Feature: Total time of the workout

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
      | Supino reto | 2    | 10 reps | 40 kg | 90   |

  Scenario: total time during the workout
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the clock reaches "2026-11-21T18:31:05.000Z"
    Then the total time should read "1:05"
    When the athlete taps "Próximo" at "2026-11-21T18:31:10.000Z"
    And the clock reaches "2026-11-21T18:31:20.000Z"
    Then the rest should show "1:20"
    And the total time should read "1:20"

  Scenario: total time in the summary
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T19:21:00.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T19:21:01.000Z"
    When the athlete taps "Próximo" at "2026-11-21T19:22:00.000Z"
    Then the screen should show "Tempo total · 52 min"
    And the total time should read "52:00"

  Scenario: workout ended early
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the athlete opens the sequence
    And the athlete taps "Encerrar" in the dialog at "2026-11-21T19:04:00.000Z"
    And the athlete taps "Encerrar" in the dialog at "2026-11-21T19:04:00.000Z"
    Then the letters should show "A" and "Sugerida"
    And the screen should show "Treino encerrado · 34 min"
