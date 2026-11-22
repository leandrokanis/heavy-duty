@US-F06-02
Feature: Edit and remove a workout through MCP

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
    And no workout is recorded

  Scenario: Removal requires confirmation
    Given a program with the days "A", each with "Supino reto" at "40 kg"
    And these workouts are recorded, one set of "Supino reto" of 10 reps each:
      | day | started                  | load  |
      | A   | 2025-04-08T12:00:00.000Z | 40 kg |
    When the planner asks to remove the workout of the week of "2025-04-07T03:00:00.000Z" through MCP
    Then the removal should be a preview that is not applied
    And the week of "2025-04-07T03:00:00.000Z" should still have 1 workout
    When the planner confirms the removal with the code of the preview through MCP
    Then the removal should be applied
    And the week of "2025-04-07T03:00:00.000Z" should have 0 workouts

  Scenario: Missing workout
    When the planner asks to edit a workout that does not exist through MCP
    Then the edit should be refused with the reason "treino não encontrado"
