@US-F02-01
Feature: Program with a goal, days and planned exercises

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
      | reto abdominal | abs   |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
      | Prancha     | time | reto abdominal |

  Scenario Outline: an exercise in the program
    Given a program with goal "hypertrophy" and the day "A"
    When the planner adds "<exercise>" with <sets> sets of "<target>", a load of "<load>" and a rest of <rest> s
    Then the day "A" should show "<exercise>" with <sets> sets of "<target>", a load of "<load>" and a rest of <rest> s

    Examples:
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
      | Prancha     | 3    | 45 s    | 0 kg  | 60   |

  Scenario: target incompatible with the kind
    Given a program with goal "hypertrophy" and the day "A"
    When the planner gives repetitions for "Prancha" in the day "A"
    Then the addition should be refused with the message "este exercício é medido por tempo"
    And the day "A" should still not have "Prancha"

  Scenario: time target on a reps exercise
    Given a program with goal "hypertrophy" and the day "A"
    When the planner gives seconds for "Supino reto" in the day "A"
    Then the addition should be refused with the message "este exercício é medido por repetições"

  Scenario: days with a free name, in plan order
    Given a program with goal "hypertrophy"
    When the planner adds the day "A" named "Superior" and the day "B" named "Inferior"
    Then the program should show the days "A Superior, B Inferior", in that order

  Scenario: repeated day in the program
    Given a program with goal "hypertrophy" and the day "A"
    When the planner adds another day "A" to the same program
    Then the addition should be refused with the message "letra já existe no programa"

  Scenario: the new program becomes the active one
    Given an active program "Programa 1"
    When the planner creates the program "Programa 2"
    Then "Programa 2" should be the active program
    And "Programa 1" should still be stored, without being the active program

  Scenario: the same result through both channels
    Given the planner built through MCP a program with goal "hypertrophy", the day "A" and "Supino reto" with 3 sets of "10 reps", a load of "40 kg" and a rest of 90 s
    When the program is requested over HTTP
    Then the day "A" should show "Supino reto" with 3 sets of "10 reps", a load of "40 kg" and a rest of 90 s
