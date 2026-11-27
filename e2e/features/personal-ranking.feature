@US-F19-02
Feature: Personal ranking of the period

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
    And the current period started 2 days ago
    # Each set at plan yields 10 points; minutes apart, no window doubles them.
    And 6 sets of "Supino reto" of 10 reps with "40 kg" are recorded 30 minutes ago
    And 2 sets of "Supino reto" of 10 reps with "40 kg" are recorded 20 minutes ago
    And 1 sets of "Supino reto" of 10 reps with "40 kg" are recorded 10 minutes ago

  Scenario: Position of the workout in the period
    Given the athlete started the day "A" on the real clock
    When the athlete records every set skipping the rests
    Then the finished workout should show "+30 pontos" and "2º do período"

  Scenario: Ranking on the Period screen
    When the athlete opens the period from the tab bar
    Then the ranking of the period should show "60 pontos", "20 pontos" and "10 pontos" in this order

  Scenario: Points of the week on the game strip
    When the athlete opens the home page
    Then the game strip should show "90 pontos na semana"
