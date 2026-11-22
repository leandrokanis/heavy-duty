@US-F03-07
Feature: Timed exercise that counts on its own, with a 3 second count

  Background:
    Given these muscles are registered:
      | muscle         | group  |
      | reto abdominal | abs    |
      | peitoral maior | chest  |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Prancha     | time | reto abdominal |
      | Supino reto | reps | peitoral maior |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Prancha     | 3    | 45 s    | 0 kg  | 60   |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |

  Scenario: timed exercise
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" on the timer at "2026-11-21T18:31:05.000Z"
    Then the count should show "3"
    And the button "Próximo" should be disabled
    When the clock reaches "2026-11-21T18:31:08.000Z"
    Then the execution clock should show "0:45"
    And no set should have been sent

  Scenario: end of the timed exercise
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" on the timer at "2026-11-21T18:31:05.000Z"
    When the clock reaches "2026-11-21T18:31:08.000Z"
    And the clock reaches "2026-11-21T18:31:51.000Z"
    Then the ring of the execution should be in the warning tone
    When the clock reaches "2026-11-21T18:31:53.000Z" and the set is sent
    Then the workout should hold the set numbers "1"
    And the workout should hold the seconds "45"
    And the rest should show "1:00"

  Scenario: timed exercise ended early
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" on the timer at "2026-11-21T18:31:05.000Z"
    And the clock reaches "2026-11-21T18:31:08.000Z"
    And the execution clock should show "0:45"
    When the clock reaches "2026-11-21T18:31:23.000Z"
    Then the execution clock should show "0:30"
    When the athlete taps "Próximo" at "2026-11-21T18:31:23.000Z"
    Then the workout should hold the seconds "15"
    And the rest should show "1:00"

  Scenario: execution cancelled
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" on the timer at "2026-11-21T18:31:05.000Z"
    And the clock reaches "2026-11-21T18:31:08.000Z"
    And the execution clock should show "0:45"
    And the clock reaches "2026-11-21T18:31:23.000Z"
    When the athlete taps "Cancelar" on the timer at "2026-11-21T18:31:23.000Z"
    Then the screen should show "Prancha" with the target "45" s and set "1 de 3"
    And no set should have been sent

  Scenario: screen off during the execution
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" on the timer at "2026-11-21T18:31:05.000Z"
    And the clock reaches "2026-11-21T18:31:08.000Z"
    And the execution clock should show "0:45"
    And the clock reaches "2026-11-21T18:31:23.000Z"
    When the clock reaches "2026-11-21T18:32:03.000Z" and the set is sent
    Then the workout should hold the seconds "45"
    And the rest should show "0:50"
