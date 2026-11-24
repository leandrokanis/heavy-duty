@US-F03-09
Feature: Discard the workout in progress

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
      | Crucifixo   | reps | peitoral maior |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
      | Crucifixo   | 3    | 12 reps | 14 kg | 60   |

  Scenario: discarded workout
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:01.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:02.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:03.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:04.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the workout should hold 3 sets on the server
    When the athlete opens the sequence
    And the athlete taps "Descartar" in the dialog at "2026-11-21T18:40:00.000Z"
    Then the dialog should read "3 séries feitas saem do histórico"
    When the athlete taps "Descartar" in the dialog at "2026-11-21T18:40:10.000Z"
    Then the letters should show "A" and "Sugerida"
    And the server should end with no workout

  Scenario: discard cancelled
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:01.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:02.000Z"
    When the athlete opens the sequence
    And the athlete taps "Descartar" in the dialog at "2026-11-21T18:40:00.000Z"
    And the athlete taps "Continuar" in the dialog at "2026-11-21T18:40:10.000Z"
    Then the screen should show "Supino reto" with "40" kg, "10" rep and set "2 de 3"
    And the workout should hold 1 sets on the server

  Scenario: discard without signal
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the connection drops
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:06.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:10.000Z" without waiting for the send
    When the athlete opens the sequence
    And the athlete taps "Descartar" in the dialog at "2026-11-21T18:40:00.000Z"
    And the athlete taps "Descartar" in the dialog at "2026-11-21T18:40:10.000Z"
    Then the letters should show "A" and "Sugerida"
    When the connection returns and the app sends the removal
    Then the removal should be answered 404 and no set should reach the server
