@US-F02-02
Feature: Edit the program without changing the history

  Background:
    Given these muscles are registered:
      | muscle         | group      |
      | peitoral maior | chest      |
      | reto abdominal | abs        |
      | vasto lateral  | quadriceps |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
      | Prancha     | time | reto abdominal |
      | Agachamento | reps | vasto lateral  |

  Scenario: editing keeps the history
    Given a recorded workout with "Supino reto" at "40 kg"
    When the planner changes the load of "Supino reto" in the program to "42,5 kg"
    Then the next workout should suggest "42,5 kg" for "Supino reto"
    And the recorded workout should still have "Supino reto" at "40 kg"

  Scenario: change sets, target and rest of a planned exercise
    Given a program with the day "A" and "Supino reto" with 3 sets of "10 reps", a load of "40 kg" and a rest of 90 s
    When the planner changes "Supino reto" in the day "A" to 4 sets of "8 reps" and a rest of 120 s
    Then the day "A" should show "Supino reto" with 4 sets of "8 reps", a load of "40 kg" and a rest of 120 s

  Scenario: target incompatible with the kind on edit
    Given a program with the day "A" and "Prancha" with 3 sets of "45 s", a load of "0 kg" and a rest of 60 s
    When the planner changes the target of "Prancha" in the day "A" to "10 reps"
    Then the edit should be refused with the message "este exercício é medido por tempo"
    And the day "A" should show "Prancha" with 3 sets of "45 s", a load of "0 kg" and a rest of 60 s

  Scenario: change the goal of the program
    Given a program with goal "hypertrophy"
    When the planner changes the goal to "strength"
    Then the program should show the goal "strength"

  Scenario: change the frequency by removing a day
    Given a program with the days "A, B, C" and a recorded workout of the day "C" with "Agachamento" at "60 kg"
    When the planner removes the day "C" from the program
    Then the program should show only the days "A, B", in that order
    And the recorded workout should still be of the day "C", with "Agachamento" at "60 kg"

  Scenario: remove a planned exercise already trained
    Given a recorded workout with "Supino reto" at "40 kg"
    When the planner removes "Supino reto" from the day "A"
    Then the day "A" should no longer show "Supino reto"
    And the recorded workout should still have "Supino reto" at "40 kg"

  Scenario: choose another active program
    Given the programs "Programa 1" and "Programa 2", with "Programa 2" active
    When the planner chooses "Programa 1" as the active program
    Then "Programa 1" should be the active program
    And "Programa 2" should still be stored, without being the active program

  Scenario: the same edit through both channels
    Given a program with the day "A" and "Supino reto" with 3 sets of "10 reps", a load of "40 kg" and a rest of 90 s
    And the planner changed through MCP the load of "Supino reto" in the day "A" to "42,5 kg"
    When the program is requested over HTTP
    Then the day "A" should show "Supino reto" with 3 sets of "10 reps", a load of "42,5 kg" and a rest of 90 s
