@US-F12-01
Feature: Suggestion of the letter of the day by the activity windows

  Background:
    Given these muscles are registered:
      | muscle          | group      |
      | peitoral maior  | chest      |
      | grande dorsal   | back       |
      | reto femoral    | quadriceps |
      | bíceps braquial | biceps     |
    And these exercises are registered:
      | exercise          | kind | primary         |
      | Supino declinado  | reps | peitoral maior  |
      | Remada baixa      | reps | grande dorsal   |
      | Agachamento livre | reps | reto femoral    |
      | Rosca direta      | reps | bíceps braquial |
    And no workout is recorded
    And the athlete signed in with a passkey

  Scenario: letter with most groups resting
    Given an active program with goal "hypertrophy" and these days:
      | day | exercise          | sets | target  | load  | rest |
      | A   | Supino declinado  | 3    | 10 reps | 40 kg | 90   |
      | B   | Remada baixa      | 3    | 10 reps | 40 kg | 90   |
      | C   | Agachamento livre | 3    | 10 reps | 60 kg | 120  |
    And 1 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 50 hours ago on the day "B"
    And 1 sets of "Supino declinado" of 10 reps with "40 kg" are recorded 2 hours ago on the day "A"
    And 1 sets of "Agachamento livre" of 10 reps with "60 kg" are recorded 1 hour ago on the day "C"
    When the athlete opens the app
    Then the day "B" should appear as the suggested day

  Scenario: cooling groups weigh more
    Given an active program with goal "hypertrophy" and these days:
      | day | exercise          | sets | target  | load  | rest |
      | A   | Supino declinado  | 3    | 10 reps | 40 kg | 90   |
      | B   | Remada baixa      | 3    | 10 reps | 40 kg | 90   |
      | C   | Agachamento livre | 3    | 10 reps | 60 kg | 120  |
    And 1 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 50 hours ago on the day "B"
    And 1 sets of "Agachamento livre" of 10 reps with "60 kg" are recorded 170 hours ago on the day "C"
    And 1 sets of "Supino declinado" of 10 reps with "40 kg" are recorded 1 hour ago on the day "A"
    When the athlete opens the app
    Then the day "C" should appear as the suggested day

  Scenario: weakest group breaks the tie
    Given an active program with goal "hypertrophy" and these days:
      | day | exercise         | sets | target  | load  | rest |
      | A   | Supino declinado | 3    | 10 reps | 40 kg | 90   |
      | B   | Remada baixa     | 3    | 10 reps | 40 kg | 90   |
      | C   | Rosca direta     | 3    | 10 reps | 20 kg | 60   |
    And 3 sets of "Remada baixa" of 10 reps with "40 kg" are recorded 50 hours ago on the day "B"
    And 1 sets of "Rosca direta" of 10 reps with "20 kg" are recorded 50 hours ago on the day "C"
    And 1 sets of "Supino declinado" of 10 reps with "40 kg" are recorded 1 hour ago on the day "A"
    When the athlete opens the app
    Then the day "C" should appear as the suggested day

  Scenario: no history
    Given an active program with goal "hypertrophy" and these days:
      | day | exercise          | sets | target  | load  | rest |
      | A   | Supino declinado  | 3    | 10 reps | 40 kg | 90   |
      | B   | Remada baixa      | 3    | 10 reps | 40 kg | 90   |
      | C   | Agachamento livre | 3    | 10 reps | 60 kg | 120  |
    When the athlete opens the app
    Then the day "A" should appear as the suggested day
