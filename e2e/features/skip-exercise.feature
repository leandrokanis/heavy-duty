@US-F03-05
Feature: Skip an exercise and see what was left out

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | reto abdominal   | abs     |
      | tríceps braquial | triceps |
    And these exercises are registered:
      | exercise         | kind | primary          |
      | Supino reto      | reps | peitoral maior   |
      | Prancha          | time | reto abdominal   |
      | Tríceps na polia | reps | tríceps braquial |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino reto      | 3    | 10 reps | 40 kg | 90   |
      | Prancha          | 3    | 45 s    | 0 kg  | 60   |
      | Tríceps na polia | 3    | 12 reps | 20 kg | 60   |

  Scenario: skipped exercise
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    When the athlete opens the sequence
    Then the button "Pular Prancha" should be at least 56 px tall and the sheet should not scroll sideways
    When the athlete skips "Prancha" in the sequence at "2026-11-21T18:31:10.000Z"
    Then the screen should show "Tríceps na polia" with "20" kg, "12" rep and set "1 de 3"
    When the athlete opens the sequence
    Then the sequence sheet should list "Prancha" as "Pulado" with "0 de 3"

  Scenario: end with a skipped exercise
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    And the athlete skips "Prancha" in the sequence at "2026-11-21T18:31:10.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:20.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:21.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:22.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:23.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:24.000Z"
    Then the screen should show the heading "Treino concluído" with no rest and no dialog
    And the screen should show the left out section with "Prancha" and "0 de 3"
    And the exercises should show "2 de 3"

  Scenario: skip during the rest
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:01.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:02.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:03.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:04.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the athlete skips "Prancha" in the sequence at "2026-11-21T18:31:10.000Z"
    Then the rest should show "1:25"
    And the screen should show "A seguir" and "Tríceps na polia"
    When the clock reaches "2026-11-21T18:32:35.000Z"
    Then the screen should show "Tríceps na polia" with "20" kg, "12" rep and set "1 de 3"

  Scenario: skipped exercise recorded on the server
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    And the athlete skips "Prancha" in the sequence at "2026-11-21T18:31:10.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:20.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:21.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:22.000Z"
    And the athlete skips the rest with "Próximo" at "2026-11-21T18:31:23.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:24.000Z"
    Then the workout should be recorded as ended at "2026-11-21T18:31:24.000Z" with the reason "completed"
    And the workout should hold the skipped exercise "prancha" at "2026-11-21T18:31:10.000Z"

  Scenario: skipped exercise without signal
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino reto      | 1    | 10 reps | 40 kg | 90   |
      | Prancha          | 1    | 45 s    | 0 kg  | 60   |
      | Tríceps na polia | 1    | 12 reps | 20 kg | 60   |
    And the page follows the answers of the API
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the connection drops
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the athlete skips "Prancha" in the sequence at "2026-11-21T18:31:10.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:11.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:20.000Z" without waiting for the send
    Then the screen should show "2 séries aguardando envio"
    When the connection returns
    Then the API should have answered the sets, then the skip and then the finish
    And the workout should hold the skipped exercise "prancha" at "2026-11-21T18:31:10.000Z"
    And the workout should be recorded as ended at "2026-11-21T18:31:20.000Z" with the reason "completed"
