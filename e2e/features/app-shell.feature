@EN-S0
Feature: App shell

  Scenario: the home page shows the product name
    When the athlete opens the home page
    Then the page should show the heading "Heavy Duty"

  Scenario: the production build is installable and works offline
    Given the athlete opened the home page
    Then the page should link to the web app manifest
    And the service worker should be active
    When the connection drops and the athlete opens another page
    Then the page should show the heading "Sem conexão"
