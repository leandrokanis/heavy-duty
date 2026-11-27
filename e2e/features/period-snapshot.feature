@US-F11-02
Feature: Snapshot of the period

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
    # Period 1 ended 14 weeks ago and period 2 two weeks ago; period 3 is the current one.
    And the first period started 26 weeks before this week
    And 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 3360 hours ago
    And 3 sets of "Supino reto" of 10 reps with "40 kg" are recorded 1344 hours ago

  Scenario: Collection of snapshots
    When the athlete opens the period from the tab bar
    Then the snapshots of "Período 2" and "Período 1" should show side by side

  Scenario: Frozen snapshot
    Given the planner reads the snapshot of period 1 through MCP
    When the planner changes the first set of period 1 to 80 kg through MCP, with the confirmation
    Then the snapshot of period 1 should be the same through MCP
