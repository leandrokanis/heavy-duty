@US-F15b-02
Feature: Weekly goal of activity windows

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
      | Crucifixo máquina | reps | peitoral maior |
      | Remada baixa      | reps | grande dorsal  |
      | Agachamento livre | reps | reto femoral   |
      | Panturrilha em pé | reps | gastrocnêmio   |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise     | sets | target  | load  | rest |
      | Supino reto  | 3    | 10 reps | 40 kg | 90   |

  # Supino reto may come from the catalog scenarios with triceps as a secondary muscle, so the
  # windows come from exercises with a single muscle group.
  Scenario: Progress of the weekly goal
    Given the planner sets the weekly goal of 6 windows through MCP
    And 3 sets of "Crucifixo máquina" of 10 reps with "40 kg" are recorded 50 hours ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 50 hours ago
    And 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 50 hours ago
    And 3 sets of "Panturrilha em pé" of 10 reps with "40 kg" are recorded 50 hours ago
    And 3 sets of "Crucifixo máquina" of 10 reps with "40 kg" are recorded 1 minute ago
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 1 minute ago
    And 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 1 minute ago
    And 3 sets of "Panturrilha em pé" of 10 reps with "40 kg" are recorded 1 minute ago
    When the athlete opens the app on a 320 px wide screen
    Then the game strip should show 4 of 6 windows used in the week
    And the weekly goal should have no horizontal overflow

  Scenario: Goal set through Claude
    When the planner sets the weekly goal of 8 windows through MCP
    Then the planner should see the weekly goal of 8 in the week of now through MCP
    When the athlete opens the app
    Then the game strip should show the weekly goal of 8 windows
