@US-F20-01
Feature: Workout history on the phone

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
    And an active program with goal "hypertrophy" and the day "A":
      | exercise    | sets | target  | load  | rest |
      | Supino reto | 3    | 10 reps | 40 kg | 90   |
      | Prancha     | 3    | 45 s    | 0 kg  | 60   |

  Scenario: List of workouts
    Given these sets were recorded:
      | day | days ago | exercise    | load  | measure |
      | A   | 8        | Supino reto | 40 kg | 10 reps |
      | B   | 6        | Supino reto | 40 kg | 10 reps |
      | C   | 4        | Supino reto | 40 kg | 10 reps |
    When the athlete opens the history from the workout of the day
    Then the history should list these workouts in this order:
      | workout |
      | Letra C |
      | Letra B |
      | Letra A |
    And each workout of the history should show its date

  Scenario: Workout detail
    Given these sets were recorded:
      | day | days ago | exercise    | load    | measure |
      | A   | 2        | Supino reto | 42,5 kg | 10 reps |
      | A   | 2        | Supino reto | 42,5 kg | 8 reps  |
      | A   | 2        | Prancha     | 0 kg    | 45 s    |
    When the athlete opens the history from the workout of the day
    And the athlete opens the workout "Letra A" of the history
    Then the detail should show these sets of "Supino reto":
      | set                             |
      | Série 1: 42,5 kg, 10 repetições |
      | Série 2: 42,5 kg, 8 repetições  |
    And the detail should show these sets of "Prancha":
      | set                       |
      | Série 1: 0 kg, 45 segundos |

  Scenario: History without editing
    Given these sets were recorded:
      | day | days ago | exercise    | load  | measure |
      | A   | 2        | Supino reto | 40 kg | 10 reps |
    When the athlete opens the history from the workout of the day
    And the athlete opens the workout "Letra A" of the history
    Then the detail should offer no control that changes the workout

  Scenario: Older workouts
    Given these sets were recorded:
      | day | days ago | exercise    | load  | measure |
      | A   | 2        | Supino reto | 40 kg | 10 reps |
      | B   | 100      | Supino reto | 40 kg | 10 reps |
    When the athlete opens the history from the workout of the day
    Then the history should list these workouts in this order:
      | workout |
      | Letra A |
    When the athlete taps "Treinos anteriores"
    Then the history should list these workouts in this order:
      | workout |
      | Letra A |
      | Letra B |

  Scenario: Without a connection
    Given the athlete opened the app with a connection and the service worker controls it
    And the connection drops
    When the athlete taps the link "Histórico"
    Then the screen should show "Sem conexão" with the way back to the workout of the day
    When the athlete taps "Voltar ao treino do dia"
    Then the screen should show the days of the program again
