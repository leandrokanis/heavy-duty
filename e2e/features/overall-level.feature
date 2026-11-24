@US-F10-05
Feature: Overall level and the group that limits it

  Background:
    Given these muscles are registered:
      | muscle         | group      |
      | peitoral maior | chest      |
      | grande dorsal  | back       |
      | reto femoral   | quadriceps |
      | gastrocnêmio   | calves     |
    And these exercises are registered:
      | exercise          | kind | primary        |
      | Supino reto       | reps | peitoral maior |
      | Remada baixa      | reps | grande dorsal  |
      | Agachamento livre | reps | reto femoral   |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise          | sets | target  | load  | rest |
      | Agachamento livre | 3    | 10 reps | 40 kg | 90   |
    And the program also has the day "B":
      | exercise     | sets | target  | load  | rest |
      | Supino reto  | 3    | 10 reps | 40 kg | 90   |
      | Remada baixa | 3    | 10 reps | 40 kg | 90   |
    And the program also has the day "C":
      | exercise          | sets | target  | load  | rest |
      | Agachamento livre | 4    | 10 reps | 40 kg | 90   |
      | Supino reto       | 3    | 10 reps | 40 kg | 90   |

  Scenario: overall level
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 1 hour ago
    When the athlete opens the app on a 320 px wide screen
    Then the overall level should show 1, limited by "Quadríceps"
    And the overall level should have a touch area of at least 44 px and no horizontal overflow

  Scenario: group out of the program
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 1 hour ago
    When the athlete opens the app
    Then the overall level should show 2, limited by "Quadríceps"

  Scenario: shortcut of the overall level
    Given 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 126 hours ago
    And 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 1 hour ago
    When the athlete opens the app
    And the athlete taps the overall level
    Then the sheet to start the day "C" should show

  Scenario: group that limits is resting
    Given 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Agachamento livre" of 10 reps with "10 kg" are recorded 1 hour ago
    When the athlete opens the app
    And the athlete taps the overall level
    Then the screen should show when the window of "Quadríceps" opens, with no sheet
