@US-F03-01
Feature: Open the workout of the day with the first exercise ready and the values filled in

  Background:
    Given these muscles are registered:
      | muscle         | group |
      | peitoral maior | chest |
      | reto abdominal | abs   |
    And these exercises are registered:
      | exercise    | kind | primary        |
      | Supino reto | reps | peitoral maior |
      | Prancha     | time | reto abdominal |
    And no workout is recorded
    And the athlete signed in with a passkey

  Scenario Outline: values filled in
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
    And <situation>
    When the athlete opens the day "A"
    Then the workout screen should show "Supino reto" with "<load>" and "10 rep"

    Examples:
      | situation                                                    | load    |
      | it is the first time with this exercise                      | 40 kg   |
      | in the last workout the athlete did "Supino reto" at "42,5 kg" | 42,5 kg |

    @BUG-57
    Examples: last workout with other reps than the program
      | situation                                                                  | load    |
      | in the last workout the athlete did "Supino reto" at "42,5 kg" with 8 reps | 42,5 kg |

  Scenario: start sheet before the workout
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
      | Prancha     | 3    | 45 s    | 0 kg  | 60   |
    When the athlete taps the day "A"
    Then a sheet should show "Supino reto" with "3 séries", "Prancha" with "3 séries" and "11 min"
    And the sheet controls should be at least 56 px tall
    And the workout screen should not be showing
    When the athlete taps "Começar"
    Then the workout screen should show "Supino reto" with "40 kg" and "10 rep"

  Scenario: give up on the start sheet
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
    And the athlete opened the sheet of the day "A"
    When the athlete closes the sheet
    Then the screen should show the days of the program again
    And the app should not have recorded anything

  Scenario: suggested day from the program sequence
    Given an active program with the days "A, B, C"
    And the last workout of this program was of the day "B"
    When the athlete opens the app
    Then the day "C" should appear as the suggested day

  Scenario: first day when there is no workout
    Given an active program with the days "A, B"
    When the athlete opens the app
    Then the day "A" should appear as the suggested day

  Scenario: time exercise filled in
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise | sets | target | load | rest |
      | Prancha  | 3    | 45 s   | 0 kg | 60   |
    When the athlete opens the day "A"
    Then the workout screen should show "Prancha" with "0 kg" and "45 s"

  Scenario: no active program
    Given no program is active
    When the athlete opens the app
    Then the screen should show the message "Nenhum programa cadastrado. Monte um programa pelo Claude."
