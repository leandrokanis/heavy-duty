@US-F16-01
Feature: Public MCP with authentication
  The planner connects Claude to the MCP of the app with a credential the PO approved once with the passkey.

  Scenario: Authenticated connection
    Given Claude is connected to the MCP with Leandro's credential
    And the program "Programa MCP" is registered
    When the planner asks for the list of programs
    Then the registered programs should be listed

  Scenario: Connection without credential
    When a client tries to use the MCP without a valid credential
    Then the call should be refused
    And no data should be exposed
