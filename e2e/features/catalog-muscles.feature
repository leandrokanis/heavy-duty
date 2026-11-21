@US-F01-01
Feature: Muscles linked to a muscle group

  Scenario: a muscle is linked to a muscle group
    Given the catalog has the 11 muscle groups of D30
    When the planner registers the muscle "tríceps braquial" in the group "triceps"
    Then the muscle should be available for exercises
    And the muscle list should show "tríceps braquial" linked to the group "tríceps"

  Scenario: a muscle without a muscle group is refused
    When the planner registers the muscle "bíceps braquial" without a muscle group
    Then the registration should be refused with the message "informe o grupo muscular"

  Scenario: the initial catalog of muscle groups
    When the planner lists the muscle groups
    Then the list should have these muscle groups in order:
      | peito               |
      | costas              |
      | lombar              |
      | ombros              |
      | bíceps              |
      | tríceps             |
      | abdômen             |
      | quadríceps          |
      | posteriores de coxa |
      | glúteos             |
      | panturrilhas        |

  Scenario: the same result through both channels
    Given the planner registered the muscle "peitoral maior" in the group "chest" through MCP
    When the muscle list is requested over HTTP
    Then the muscle list should show "peitoral maior" linked to the group "peito"
