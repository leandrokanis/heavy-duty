@US-F10-01
Feature: Points of each set

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
    And the app counts the sounds it plays

  Scenario: set that meets the plan
    Given the athlete started the day "A" on the real clock
    When the athlete taps "Próximo" on the screen
    Then "+10" should rise from "Próximo"
    And the screen should announce "Série 1 de 3 registrada, 10 pontos"
    And the points sound should play

  Scenario: set above the plan has a cap
    Given the athlete started the day "A" on the real clock
    When the athlete drags the wheel "Repetições" 20 steps up
    And the athlete taps "Próximo" on the screen
    Then "+20" should rise from "Próximo"
    And the screen should announce "Série 1 de 3 registrada, 20 pontos. Peito subiu para o nível 2"

  Scenario: set in the window
    Given 1 sets of "Supino reto" of 10 reps with "40 kg" are recorded 50 hours ago
    And the athlete started the day "A" on the real clock
    When the athlete taps "Próximo" on the screen
    Then "+20" should rise from "Próximo" with the mark "×2"
    And the screen should announce "Série 1 de 3 registrada, 20 pontos em dobro. Peito subiu para o nível 2"

  Scenario: sound off
    Given the athlete started the day "A" on the real clock
    And the athlete turns the game sound off in the sequence
    When the athlete taps "Próximo" on the screen
    Then "+10" should rise from "Próximo"
    And no sound should play
