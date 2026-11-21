@US-F14-02
Feature: Daily backup status
  The planner checks through Claude whether the daily backup of the app data ran.

  Scenario: Backup failure
    Given the daily backup failed
    When the planner checks the app status through Claude
    Then the failure should show with its date and reason
