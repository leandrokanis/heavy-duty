@US-F11-03
Feature: Streak of weeks

  Background:
    Given these muscles are registered:
      | muscle        | group |
      | grande dorsal | back  |
    And these exercises are registered:
      | exercise     | kind | primary       |
      | Remada baixa | reps | grande dorsal |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise     | sets | target  | load  | rest |
      | Remada baixa | 3    | 10 reps | 40 kg | 90   |

  # Each week, back trained on Monday and Thursday uses a window: the Thursday falls in the window
  # of the Monday, and the next Monday in the window of the Thursday.
  Scenario: Streak of weeks
    Given the first period started 4 weeks before this week
    And the weekly goal of 1 window was set 5 weeks before this week
    And "Remada baixa" is trained on Monday and Thursday from 3 to 1 weeks before this week
    When the athlete opens the home page
    Then the game strip should show the streak of 3 weeks with the protection available

  Scenario: Protection of the streak
    Given the first period started 6 weeks before this week
    And the weekly goal of 1 window was set 7 weeks before this week
    And "Remada baixa" is trained on Monday and Thursday from 6 to 2 weeks before this week
    When the athlete opens the home page
    Then the game strip should show the streak of 5 weeks with the protection used

  Scenario: Week missed with no protection
    Given the first period started 5 weeks before this week
    And the weekly goal of 1 window was set 6 weeks before this week
    And "Remada baixa" is trained on Monday and Thursday from 5 to 4 weeks before this week
    When the athlete opens the home page
    Then the game strip should show the streak of 0 weeks with the protection used
