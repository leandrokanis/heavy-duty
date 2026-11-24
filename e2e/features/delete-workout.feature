@US-F20-02
Feature: Delete a workout from the history on the phone

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

  Scenario: removal requires confirmation
    Given these sets were recorded:
      | day | days ago | exercise    | load  | measure |
      | A   | 2        | Supino reto | 40 kg | 10 reps |
    When the athlete opens the history from the workout of the day
    And the athlete opens the workout "Letra A" of the history
    And the athlete taps "Apagar treino" on the screen
    Then the confirmation "Apagar treino" should read "1 série sai do histórico"
    And the server should still hold 1 workout
    When the athlete taps "Apagar" in the confirmation
    Then the screen should show "Treino apagado"
    And the screen should show "Nenhum treino nos últimos 92 dias. Os treinos registrados no celular aparecem aqui."
    And the server should end with no workout

  Scenario: removal cancelled
    Given these sets were recorded:
      | day | days ago | exercise    | load  | measure |
      | A   | 2        | Supino reto | 40 kg | 10 reps |
    When the athlete opens the history from the workout of the day
    And the athlete opens the workout "Letra A" of the history
    And the athlete taps "Apagar treino" on the screen
    And the athlete taps "Cancelar" in the confirmation
    Then the screen should show the heading "Letra A"
    And the server should still hold 1 workout

  Scenario: workout in progress on the phone
    Given the athlete started the day "A" at "2026-11-21T18:30:00.000Z"
    And the athlete taps "Próximo" at "2026-11-21T18:31:05.000Z"
    When the athlete opens the history page
    And the athlete opens the workout "Letra A" of the history
    Then the screen should show the heading "Letra A"
    And the screen should not offer "Apagar treino"
