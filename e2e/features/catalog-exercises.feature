@US-F01-02
Feature: Reps or time exercise with the muscles it works

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | tríceps braquial | triceps |
      | reto abdominal   | abs     |
      | oblíquo externo  | abs     |

  Scenario Outline: an exercise of each kind
    When the planner registers the exercise "<exercise>" of kind "<kind>" with primary muscles "<primary>" and secondary muscles "<secondary>"
    Then the exercise should be available for programs
    And the exercise list should show "<exercise>" linked to the groups "<groups>"

    Examples:
      | exercise    | kind | primary        | secondary        | groups         |
      | Supino reto | reps | peitoral maior | tríceps braquial | peito, tríceps |
      | Prancha     | time | reto abdominal |                  | abdômen        |

  Scenario: an exercise without muscles is refused
    When the planner registers the exercise "Remada curvada" of kind "reps" without muscles
    Then the registration should be refused with the message "informe ao menos um músculo"

  Scenario: an exercise with only a secondary muscle is refused
    When the planner registers the exercise "Mergulho" of kind "reps" with primary muscles "" and secondary muscles "tríceps braquial"
    Then the registration should be refused with the message "informe ao menos um músculo"

  Scenario: the same result through both channels
    Given the planner registered the exercise "Prancha lateral" of kind "time" with the primary muscle "oblíquo externo" through MCP
    When the exercise list is requested over HTTP
    Then the exercise list should show "Prancha lateral" of kind "time" linked to the groups "abdômen"
