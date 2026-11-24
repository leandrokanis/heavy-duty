@US-F18-01
Feature: Personal records

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

  Scenario: record mark on the set
    Given in the last workout the athlete did "Supino reto" at "42,5 kg" with 10 reps
    When the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    Then the record mark beside the load should read "Recorde: 42,5 kg"

  Scenario: load above the record
    Given in the last workout the athlete did "Supino reto" at "42,5 kg" with 10 reps
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete drags the wheel "Carga" 1 steps up
    Then the record mark beside the load should read "Acima do recorde de 42,5 kg"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the button of the last set should show a record
    When the athlete skips the rest with "Próximo" at "2026-11-21T18:31:30.000Z"
    Then the record mark beside the load should read "Recorde: 45 kg"

  Scenario: more reps with the same load
    Given in the last workout the athlete did "Supino reto" at "40 kg" with 10 reps
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete drags the wheel "Repetições" 2 steps up
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the button of the last set should show a record

  Scenario: last set correction
    Given in the last workout the athlete did "Supino reto" at "42,5 kg" with 10 reps
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete drags the wheel "Carga" 1 steps up
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    And the athlete lowers "Carga" by 2 step in the correction of the last set
    Then the button of the last set should not show a record
    When the athlete skips the rest with "Próximo" at "2026-11-21T18:31:30.000Z"
    Then the record mark beside the load should read "Recorde: 42,5 kg"
