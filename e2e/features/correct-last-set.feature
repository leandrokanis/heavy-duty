@US-F04-02
Feature: Correct the last recorded set

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
      | reto abdominal | abs   |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
      | Prancha     | time | reto abdominal |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 45 kg | 90   |
      | Prancha     | 1    | 45 s    | 0 kg  | 60   |

  Scenario: last set correction
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete lowers "Carga" by 1 step in the correction of the last set
    Then the workout should hold the set 1 of "Supino reto" with load 42500 g and 10 reps
    And the button of the last set should read "42,5 kg · 10 rep"

  @BUG-55
  Scenario: wheel drag inside the correction sheet
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete drags the wheel "Carga" of the correction 2 steps down with a finger
    Then the correction of the last set should stay in place with the wheel "Carga" at "50"
    When the athlete saves the correction of the last set
    Then the workout should hold the set 1 of "Supino reto" with load 50000 g and 10 reps

  Scenario: correction without signal
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the page follows the writes of the API to the sets
    And the connection drops
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the athlete lowers "Carga" by 1 step in the correction of the last set
    Then the button of the last set should read "42,5 kg · 10 rep"
    When the connection returns
    Then the API should have received the set at 45000 g and then the correction at 42500 g
    And the workout should hold the set 1 of "Supino reto" with load 42500 g and 10 reps

  Scenario: correction of the last set of the workout
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    When the athlete taps "Próximo" on the timer at "2026-11-21T18:32:00.000Z"
    And the clock reaches "2026-11-21T18:32:48.000Z" and the set is sent
    Then the screen should show the heading "Treino concluído" with no rest and no dialog
    When the athlete lowers "Tempo" by 1 step in the correction of the last set
    Then the workout should hold the set 1 of "Prancha" with 40 seconds

  Scenario: timed exercise correction
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete is on the exercise "Prancha"
    When the athlete taps "Próximo" on the timer at "2026-11-21T18:31:00.000Z"
    And the clock reaches "2026-11-21T18:31:48.000Z" and the set is sent
    And the athlete lowers "Tempo" by 1 step in the correction of the last set
    Then the workout should hold the set 1 of "Prancha" with 40 seconds
