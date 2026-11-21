@US-F03-02
Feature: Mark the set as done with one tap

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
      | Supino reto | 3    | 10 reps | 40 kg | 90   |

  Scenario: set with one tap
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the set of "Supino reto" should be recorded with load 40000 g, 10 reps and set number 1 in the workout of the day "A"
    And the rest should show "1:30"
    And the rest should show "1:29" one second later
    And the "Próximo" button should be at least 56 px tall in the lower half of the screen

  Scenario: accidental double tap
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" twice in a row
    Then only one set should be recorded in the workout

  Scenario: first set creates the workout
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the workout of the day "A" should exist with the start "2026-11-21T18:30:00.000Z"
    And the next set of the same workout should go into the same workout

  Scenario: set with the load of the last workout
    Given in the last workout the athlete did "Supino reto" at "42,5 kg"
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the set of "Supino reto" should be recorded with load 42500 g, 10 reps and set number 1 in the workout of the day "A"

  Scenario: send failure
    Given the API does not answer the sets
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the rest should show "1:30"
    And the screen should show "Série não enviada"
    When the API answers again and the athlete taps "Reenviar"
    Then only one set should be recorded in the workout, with the id of the first send

  Scenario: resend with the same id
    Given the API recorded the first set of "Supino reto" with the id X
    When the app sends the set with the id X again with the same values
    Then the API should answer 200 with the recorded set
    And the workout should still have one set
