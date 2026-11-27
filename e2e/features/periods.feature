@US-F11-01
Feature: Periods of 12 weeks

  Background:
    Given the athlete signed in with a passkey

  Scenario: Start of the first period
    When the athlete opens the period from the tab bar
    Then the period should show its start, its end 12 weeks later and the week of now
    And the tab bar should mark "Período" as the current section

  Scenario: The athlete writes the intention of the period
    When the athlete opens the period from the tab bar
    And the athlete writes the intention "Treinar três vezes por semana até o fim do ano."
    Then the period should show the intention "Treinar três vezes por semana até o fim do ano."
    And the planner should read the intention "Treinar três vezes por semana até o fim do ano." through MCP

  Scenario: Sections in the tab bar
    When the athlete opens the home page
    Then the tab bar should show "Treino", "Mapa" and "Período" with "Treino" as the current section
    When the athlete taps "Mapa" on the tab bar
    Then the tab bar should mark "Mapa" as the current section
