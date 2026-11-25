# The emails setting is one row for the whole app, so the scenarios run one after the other.
@US-F17-04 @mode:serial
Feature: Turn the emails off from the link in an email

  Scenario: turn the emails off from the page of the link
    Given an email notice was sent with its link to turn the emails off
    When the athlete opens the link of that email, without signing in
    Then the page should offer "Desligar e-mails" and say "Os avisos no celular continuam."
    And the emails should still be on
    When the athlete taps "Desligar e-mails"
    Then the page should say "E-mails desligados"
    And the emails should be off

  Scenario: turn the emails off with one click in the email client
    Given an email notice was sent with its link to turn the emails off
    When the email client posts the one-click unsubscribe of that email
    Then the emails should be off

  Scenario: a link that no email carried
    Given an email notice was sent with its link to turn the emails off
    When the email client posts the one-click unsubscribe with an unknown token
    Then the answer should be the same as with a valid token
    And the emails should still be on
