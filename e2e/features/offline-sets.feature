@US-F03-03
Feature: Record the workout without signal

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |

  Scenario: no signal
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the connection drops
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:06.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:10.000Z" without waiting for the send
    And the page is reloaded at "2026-11-21T18:31:20.000Z"
    Then the screen should show "2 séries aguardando envio"
    When the connection returns
    Then the workout should hold 2 sets recorded at "2026-11-21T18:31:05.000Z, 2026-11-21T18:31:10.000Z" with load 40000 g and 10 reps
    And the screen should not show "2 séries aguardando envio"

  Scenario: queue indicator
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the connection drops
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:06.000Z" without waiting for the send
    And the athlete taps "Próximo" at "2026-11-21T18:31:10.000Z" without waiting for the send
    Then the screen should show "2 séries aguardando envio"
    And the rest should show "1:30"
    When the connection returns
    Then the screen should not show "2 séries aguardando envio"

  Scenario: workout opened without signal
    Given the athlete opened the app with a connection and the service worker controls it
    And the connection drops
    When the page is reloaded
    Then the letters should show "A" and "Sugerida"
    When the athlete starts the day "A" at "2026-11-21T18:30:00.000Z" without a connection
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    Then the screen should show "1 série aguardando envio"

  Scenario: workout resumed after closing the app
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the page is reloaded at "2026-11-21T18:31:50.000Z"
    Then the screen should show the exercise "Supino reto" resting with "0:45" left

  Scenario: resend of an already recorded set
    Given the response to the first send is lost
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the queue sends again
    Then the workout should hold 1 sets recorded at "2026-11-21T18:31:05.000Z" with load 40000 g and 10 reps
    And the screen should not show "1 série aguardando envio"

  Scenario: set refused by the API
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the connection drops
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    And the planner removes "Supino reto" from the day "A"
    And the connection returns
    Then the screen should show the notice "exercício não encontrado na letra"
    And no workout should be recorded on the server
    When the athlete taps "Dispensar" on the screen
    Then the screen should show no notice

  Scenario: expired session with sets in the queue
    Given the API answers 401 to the sets
    And the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    When the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z" without waiting for the send
    Then the screen should show "1 série aguardando envio"
    When the session is valid again and the queue sends again
    Then the workout should hold 1 sets recorded at "2026-11-21T18:31:05.000Z" with load 40000 g and 10 reps
