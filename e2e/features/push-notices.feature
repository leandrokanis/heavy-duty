@US-F09-01
Feature: Push notices on the phone

  Background:
    Given the athlete signed in with a passkey

  Scenario: the app outside the home screen
    Given the app is open in the browser, outside the home screen
    Then the header buttons "Avisos" and "Histórico" should be targets of 44 px on one line
    When the athlete opens the notices control
    Then the notices switch should be unavailable with the reason "Instale o app na tela inicial."

  Scenario: the server without the push keys
    Given the app is installed on the home screen with the push endpoint "https://push.example.test/e2e/no-keys"
    When the athlete opens the notices control
    Then the notices switch should be unavailable with the reason "Avisos não configurados no servidor."

  Scenario: turn the notices on
    Given the app is installed on the home screen with the push endpoint "https://push.example.test/e2e/on"
    And the server holds the push keys
    When the athlete opens the notices control
    And the athlete turns the notices on and the system permission answers "granted"
    Then the notices switch should be on
    And the API should hold the push subscription "https://push.example.test/e2e/on"

  Scenario: permission denied
    Given the app is installed on the home screen with the push endpoint "https://push.example.test/e2e/denied"
    And the server holds the push keys
    When the athlete opens the notices control
    And the athlete turns the notices on and the system permission answers "denied"
    Then the notices switch should be off
    And the API should not hold the push subscription "https://push.example.test/e2e/denied"

  Scenario: turn the notices off
    Given the app is installed on the home screen with the push endpoint "https://push.example.test/e2e/off"
    And the server holds the push keys
    When the athlete opens the notices control
    And the athlete turns the notices on and the system permission answers "granted"
    And the athlete turns the notices off
    Then the notices switch should be off
    And the API should not hold the push subscription "https://push.example.test/e2e/off"
