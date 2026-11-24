@US-F10-03
Feature: Cooling and loss of level

  Background:
    Given these muscles are registered:
      | muscle       | group      |
      | reto femoral | quadriceps |
      | gastrocnêmio | calves     |
    And these exercises are registered:
      | exercise          | kind | primary      |
      | Agachamento livre | reps | reto femoral |
      | Panturrilha em pé | reps | gastrocnêmio |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise          | sets | target  | load  | rest |
      | Agachamento livre | 3    | 10 reps | 40 kg | 90   |
      | Panturrilha em pé | 3    | 10 reps | 20 kg | 60   |

  Scenario: bar drains after the window
    Given 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 126 hours ago
    When the athlete opens the app
    Then the day "A" should show "Quadríceps" cooling at level 2 with the bar at 23 %

  Scenario: drop of level
    Given 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 200 hours ago
    And 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 150 hours ago
    When the planner lists the muscle group levels through MCP
    Then the group "quadriceps" should be cooling at level 4, with best level 5 and a next drop

  Scenario: training stops the cooling
    Given 3 sets of "Agachamento livre" of 10 reps with "40 kg" are recorded 126 hours ago
    And the athlete started the day "A" on the real clock
    When the athlete taps "Próximo" on the screen
    Then the group "quadriceps" should stop cooling once the set reaches the API

  Scenario: level 1 does not drop
    Given 1 sets of "Panturrilha em pé" of 10 reps with "20 kg" are recorded 200 hours ago
    When the planner lists the muscle group levels through MCP
    Then the group "calves" should be cooling at level 1 with 0 points and no next drop
