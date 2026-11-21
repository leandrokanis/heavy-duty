@EN-S0
Feature: App shell

  Background:
    Given the athlete signed in with a passkey

  Scenario: the home page shows the product name
    When the athlete opens the home page
    Then the page should show the heading "Heavy Duty"
    And the page should not show the "Entrar" button

  Scenario: the production build is installable and works offline
    Given the athlete opened the home page
    Then the page should link to the web app manifest
    And the service worker should be active
    When the connection drops and the athlete opens another page
    Then the page should show the heading "Sem conexão"
