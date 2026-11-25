@US-F08-01
Feature: Body map

  Background:
    Given these muscles are registered:
      | muscle         | group      |
      | peitoral maior | chest      |
      | grande dorsal  | back       |
      | reto femoral   | quadriceps |
    And these exercises are registered:
      | exercise          | kind | primary        |
      | Supino declinado  | reps | peitoral maior |
      | Remada baixa      | reps | grande dorsal  |
      | Agachamento livre | reps | reto femoral   |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise          | sets | target  | load  | rest |
      | Supino declinado  | 3    | 10 reps | 40 kg | 90   |
      | Remada baixa      | 3    | 10 reps | 40 kg | 90   |
      | Agachamento livre | 3    | 10 reps | 60 kg | 120  |
    And 3 sets of "Supino declinado" of 10 reps with "40 kg" are recorded 50 hours ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 1 hour ago
    And 3 sets of "Agachamento livre" of 10 reps with "60 kg" are recorded 170 hours ago

  Scenario: State of each group on the map
    When the athlete opens the body map from the workout of the day
    Then the body map should show these groups:
      | group      | state         |
      | Peito      | Janela aberta |
      | Costas     | Descansando   |
      | Quadríceps | Esfriando     |
    And the figure should mark "chest" as "open", "back" as "resting" and "quadriceps" as "cooling"

  Scenario: State without depending on colour alone
    When the athlete opens the body map from the workout of the day
    Then every part of "quadriceps" on the figure should be hatched
    And every group of the body map should say its state in text

  Scenario: Group detail
    When the athlete opens the body map from the workout of the day
    And the athlete taps "chest" on the figure
    Then the detail of "Peito" should show the level, the progress bar, the best level and the time of the window
