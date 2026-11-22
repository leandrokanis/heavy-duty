@US-F03-06
Feature: Review the sets of a done exercise

  Background:
    Given these muscles are registered:
      | muscle           | group   |
      | peitoral maior   | chest   |
      | reto abdominal   | abs     |
      | tríceps braquial | triceps |
    And these exercises are registered:
      | exercise         | kind | primary          |
      | Supino reto      | reps | peitoral maior   |
      | Prancha          | time | reto abdominal   |
      | Tríceps na polia | reps | tríceps braquial |
    And no workout is recorded
    And the athlete signed in with a passkey
    And an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino reto      | 3    | 10 reps | 40 kg | 90   |
      | Prancha          | 3    | 45 s    | 0 kg  | 60   |
      | Tríceps na polia | 3    | 12 reps | 20 kg | 60   |

  Scenario: review a done exercise
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    When the athlete opens the sequence
    Then the sequence sheet should list "Supino reto" as "Feito" with "3 de 3"
    And the list "Séries de Supino reto" should read:
      | set                              |
      | Série 1: 40 kg, 10 repetições    |
      | Série 2: 40 kg, 10 repetições    |
      | Série 3: 40 kg, 10 repetições    |
    And the figures in the list "Séries de Supino reto" should be tabular

  Scenario: review after reopening the app
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    When the page is reloaded at "2026-11-21T18:31:30.000Z"
    And the athlete opens the sequence
    Then the list "Séries de Supino reto" should read:
      | set                              |
      | Série 1: 40 kg, 10 repetições    |
      | Série 2: 40 kg, 10 repetições    |
      | Série 3: 40 kg, 10 repetições    |

  Scenario: the sheet on a short screen
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete recorded the 3 sets of the first exercise from "2026-11-21T18:31:01.000Z"
    And the athlete recorded the 3 sets of the exercise on screen from "2026-11-21T18:31:10.000Z"
    And the screen is 480 px tall
    When the athlete opens the sequence
    Then the title "Sequência do treino" and the buttons "Fechar" and "Encerrar" should be in the viewport
    And the list of exercises should scroll inside the sheet
    When the athlete scrolls the list of exercises to the end
    Then the page behind the sheet should not have scrolled
    And the row of "Tríceps na polia" should be in the viewport
