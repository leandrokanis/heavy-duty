@US-F15b-02
Feature: Weekly goal of activity windows

  Scenario: Goal set through Claude
    When the planner sets the weekly goal of 8 windows through MCP
    Then the planner should see the weekly goal of 8 in the week of now through MCP
