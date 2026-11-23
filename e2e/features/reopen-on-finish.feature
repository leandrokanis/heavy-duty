@US-F07-03
Feature: Reopening of the groups on the finished workout

  Background:
    Given these muscles are registered:
      | muscle           | group     |
      | peitoral maior   | chest     |
      | deltoide lateral | shoulders |
      | tríceps braquial | triceps   |
    And these exercises are registered:
      | exercise                | kind | primary          |
      | Supino inclinado        | reps | peitoral maior   |
      | Elevação lateral        | reps | deltoide lateral |
      | Tríceps testa           | reps | tríceps braquial |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino inclinado | 1    | 10 reps | 30 kg | 60   |
      | Elevação lateral | 1    | 12 reps | 8 kg  | 60   |
      | Tríceps testa    | 1    | 12 reps | 15 kg | 60   |

  Scenario: Reopening at the end of the workout
    Given the athlete started the day "A" on the real clock
    When the athlete records every set skipping the rests
    Then the finished workout should show the reopening of "Peito, Ombros, Tríceps"
    And the button "Fechar" should be visible below the reopening

  Scenario: Exercise left out of the workout
    Given the athlete started the day "A" on the real clock
    And the athlete skips "Supino inclinado" in the sequence
    When the athlete records every set skipping the rests
    Then the finished workout should show the reopening of "Ombros, Tríceps"

  Scenario: Without a connection
    Given the athlete started the day "A" on the real clock
    And the API does not answer the sets
    When the athlete records every set skipping the rests
    Then the finished workout should not show the reopening
    And the button "Fechar" should be inside the visible area

  Scenario: Workout ended early
    Given the athlete started the day "A" on the real clock
    When the athlete records one set and ends the workout
    Then the day "A" in the letters should show only "Peito · abre"
