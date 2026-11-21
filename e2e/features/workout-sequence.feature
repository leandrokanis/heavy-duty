@US-F03-04
Feature: Workout sequence and going to any exercise that is missing

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | tríceps braquial | triceps |
    And these exercises are registered:
      | exercise         | kind | primary          |
      | Supino reto      | reps | peitoral maior   |
      | Crucifixo        | reps | peitoral maior   |
      | Tríceps na polia | reps | tríceps braquial |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino reto      | 3    | 10 reps | 40 kg | 90   |
      | Crucifixo        | 3    | 12 reps | 14 kg | 60   |
      | Tríceps na polia | 3    | 12 reps | 20 kg | 60   |

  Scenario: exercise out of the order
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:06.000Z"
    When the athlete picks "Tríceps na polia" in the sequence at "2026-11-21T18:31:10.000Z"
    Then the screen should show "Tríceps na polia" with "20" kg, "12" rep and set "1 de 3"
    And the button "Próximo" should be enabled
    When the athlete opens the sequence
    Then the sequence sheet should list "Supino reto" as "Por fazer" with "1 de 3"

  Scenario: exercise picked during the rest
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the athlete picks "Tríceps na polia" in the sequence at "2026-11-21T18:31:10.000Z"
    Then the rest should show "1:25"
    And the screen should show "A seguir" and "Tríceps na polia"
    When the clock reaches "2026-11-21T18:32:35.000Z"
    Then the screen should show "Tríceps na polia" with "20" kg, "12" rep and set "1 de 3"

  Scenario: sequence sheet
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:01.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:02.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:03.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:04.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:06.000Z"
    When the athlete opens the sequence
    Then the sequence sheet should list these exercises in this order:
      | exercise         | state     | sets   |
      | Supino reto      | Feito     | 3 de 3 |
      | Crucifixo        | Atual     | 0 de 3 |
      | Tríceps na polia | Por fazer | 0 de 3 |
    And the sequence sheet should have the button "Encerrar"

  Scenario: sequence sheet with the accessibility settings on
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the system asks for more contrast and reduced motion
    When the athlete opens the sequence
    Then the sequence sheet should be opaque, with no blur
    When the athlete presses Escape
    Then the sequence sheet should be closed

  Scenario: end with confirmation
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:01.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:02.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:03.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:04.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:06.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:07.000Z"
    When the athlete opens the sequence
    And the athlete taps "Encerrar" in the dialog at "2026-11-21T18:40:00.000Z"
    Then the confirmation should show "4 séries feitas" and "5 séries que faltam"
    When the athlete taps "Encerrar" in the dialog at "2026-11-21T18:40:30.000Z"
    Then the letters should show "A" and "Sugerida"
    And the workout should be recorded as ended at "2026-11-21T18:40:30.000Z" with the reason "ended_early"

  Scenario: workout finished on the last set recorded on the server
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Tríceps na polia | 1    | 12 reps | 20 kg | 60   |
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the screen should show the heading "Treino concluído" with no rest and no dialog
    And the workout should be recorded as ended at "2026-11-21T18:31:05.000Z" with the reason "completed"

  Scenario: end of the workout without signal
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the connection drops
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:06.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:10.000Z" without waiting for the send
    And the athlete opens the sequence
    And the athlete taps "Encerrar" in the dialog at "2026-11-21T18:40:00.000Z"
    And the athlete taps "Encerrar" in the dialog at "2026-11-21T18:40:30.000Z"
    Then the screen should show "2 séries aguardando envio"
    When the connection returns
    Then the workout should hold 2 sets recorded at "2026-11-21T18:31:05.000Z, 2026-11-21T18:31:10.000Z" with load 40000 g and 10 reps
    And the workout should be recorded as ended at "2026-11-21T18:40:30.000Z" with the reason "ended_early"
