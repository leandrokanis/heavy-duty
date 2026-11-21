@US-F14-01
Feature: Installation on the phone and sign-in with a passkey
  The athlete signs in with a passkey before any screen or API route shows training data,
  and installs the app on the phone from the app domain.

  Scenario: installation on the phone
    Given the athlete enrolled a passkey with an enrollment link
    When the browser reads the web app manifest
    Then the manifest should declare the standalone display, the start URL "/" and the three PNG icons
    And the service worker should control the page
    And the home page should show without the "Entrar" button
    And the cache should hold no API response after an API request under the service worker

  Scenario: access without credential
    Given a browser without an access session
    When it opens "/" and "/workout"
    Then each page should show the "Entrar" button with a touch area of at least 44 px
    And a data route of the API should answer 401 with code "unauthenticated"
    And the manifest, the icons, the service worker and the offline page should answer without a session

  Scenario: sign in with the passkey
    Given the athlete enrolled a passkey in another browser
    And the athlete opens the app in this browser with the same passkey
    When the athlete taps "Entrar"
    Then the home page should show without the "Entrar" button
    And the browser should hold an HttpOnly hd_session cookie

  Scenario: enrollment of the first passkey
    Given the PO generated an enrollment link on the server
    When the athlete opens the link, taps "Criar chave de acesso" and confirms on the phone
    Then the home page should show without the "Entrar" button
    And the browser should hold an HttpOnly hd_session cookie
    And the enrollment link should no longer work

  Scenario: expired or used enrollment link
    Given the athlete enrolled a passkey in another browser
    When someone opens the same link in this browser and taps "Criar chave de acesso"
    Then the page should show the message "Link de cadastro inválido ou vencido. Gere outro link no servidor."
    And the browser should hold no hd_session cookie

  Scenario: sign-in refused
    Given a new browser whose phone has a passkey that fails user verification
    When the athlete taps "Entrar"
    Then the page should show the message "Não foi possível entrar. Tente de novo."
    And the browser should hold no hd_session cookie

  Scenario: sign out
    Given the athlete enrolled a passkey with an enrollment link
    When the app ends the access session
    And the athlete opens the app again
    Then the page should show the "Entrar" button
