@US-F04-01
Feature: Adjust load, reps and time by dragging before recording the set

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
      | Prancha     | 3    | 45 s    | 0 kg  | 60   |

  Scenario Outline: value adjustment
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete is on the exercise <exercise>
    And the wheel <wheel> shows <initial>
    When the athlete drags the wheel <wheel> <steps> steps <direction>
    Then the wheel <wheel> shows <final>

    Examples:
      | exercise      | wheel        | initial | steps | direction | final  |
      | "Supino reto" | "Carga"      | "40"    | 1     | up        | "42,5" |
      | "Supino reto" | "Repetições" | "10"    | 2     | down      | "8"    |
      | "Prancha"     | "Tempo"      | "45"    | 1     | up        | "50"   |

  Scenario: load does not go negative
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete is on the exercise "Prancha"
    And the wheel "Carga" shows "0"
    When the athlete drags the wheel "Carga" 1 steps down
    Then the wheel "Carga" shows "0"
    And the button "Diminuir carga" should be disabled

  @BUG-57
  Scenario: set recorded with the adjusted value
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete drags the wheel "Carga" 1 steps up
    And the athlete drags the wheel "Repetições" 2 steps down
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    Then the set of "Supino reto" should be recorded with load 42500 g, 8 reps and set number 1 in the workout of the day "A"
    When the athlete skips the rest with "Próximo" at "2026-11-21T18:31:06.000Z"
    Then the screen should show "Supino reto" with "42,5" kg, "10" rep and set "2 de 3"

  Scenario: timed exercise with the adjusted time
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete is on the exercise "Prancha"
    And the athlete drags the wheel "Tempo" 1 steps up
    When the athlete taps "Próximo" on the timer at "2026-11-21T18:31:05.000Z"
    And the clock reaches "2026-11-21T18:31:08.000Z"
    Then the execution clock should show "0:50"
    When the clock reaches "2026-11-21T18:31:58.000Z" and the set is sent
    Then the workout should hold the seconds "50"
