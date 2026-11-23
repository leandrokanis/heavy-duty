@US-F07-02
Feature: Activity window on the workout of the day

  Background:
    Given these muscles are registered:
      | muscle            | group      |
      | grande dorsal     | back       |
      | bíceps braquial   | biceps     |
      | eretor da espinha | lower-back |
      | reto femoral      | quadriceps |
      | peitoral maior    | chest      |
    And these exercises are registered:
      | exercise          | kind | primary           |
      | Remada baixa      | reps | grande dorsal     |
      | Rosca direta      | reps | bíceps braquial   |
      | Extensão lombar   | reps | eretor da espinha |
      | Agachamento livre | reps | reto femoral      |
      | Supino declinado  | reps | peitoral maior    |
    And no workout is recorded
    And the athlete signed in with a passkey

  Scenario: Letter with groups in window
    Given an active program with goal "hypertrophy" and the day "B":
      | exercise        | sets | target  | load  | rest |
      | Remada baixa    | 3    | 10 reps | 40 kg | 90   |
      | Rosca direta    | 3    | 10 reps | 20 kg | 90   |
      | Extensão lombar | 3    | 12 reps | 10 kg | 60   |
    And 1 sets of "Remada baixa" of 10 reps with "10 kg" are recorded 50 hours ago
    And 1 sets of "Rosca direta" of 10 reps with "10 kg" are recorded 50 hours ago
    When the athlete opens the app
    Then the day "B" should show these windows:
      | window         |
      | Costas · fecha |
      | Bíceps · fecha |

  Scenario: Group resting in the letter
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino declinado | 3    | 10 reps | 40 kg | 90   |
    And 1 sets of "Supino declinado" of 10 reps with "10 kg" are recorded 1 hour ago
    When the athlete opens the app
    Then the day "A" should show these windows:
      | window       |
      | Peito · abre |

  Scenario: Workout of the day without history
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise         | sets | target  | load  | rest |
      | Supino declinado | 3    | 10 reps | 40 kg | 90   |
    When the athlete opens the app
    Then the day "A" should show no windows

  Scenario: Group cooling
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise          | sets | target  | load  | rest |
      | Agachamento livre | 3    | 10 reps | 60 kg | 120  |
    And 1 sets of "Agachamento livre" of 10 reps with "10 kg" are recorded 170 hours ago
    When the athlete opens the app
    Then the day "A" should show these windows:
      | window                           |
      | Quadríceps · esfriando há 2 dias |

  Scenario: Without a connection
    Given an active program with goal "hypertrophy" and the day "A":
      | exercise     | sets | target  | load  | rest |
      | Remada baixa | 3    | 10 reps | 40 kg | 90   |
    And 1 sets of "Remada baixa" of 10 reps with "10 kg" are recorded 50 hours ago
    And the athlete opened the app with a connection and the service worker controls it
    And the day "A" should show these windows:
      | window         |
      | Costas · fecha |
    And the connection drops
    When the page is reloaded
    Then the day "A" should show these windows:
      | window         |
      | Costas · fecha |

  Scenario: Badges keep the row usable on a narrow screen
    Given an active program with goal "hypertrophy" and the day "B":
      | exercise          | sets | target  | load  | rest |
      | Remada baixa      | 3    | 10 reps | 40 kg | 90   |
      | Rosca direta      | 3    | 10 reps | 20 kg | 90   |
      | Agachamento livre | 3    | 10 reps | 60 kg | 120  |
    And 1 sets of "Remada baixa" of 10 reps with "10 kg" are recorded 50 hours ago
    And 1 sets of "Rosca direta" of 10 reps with "10 kg" are recorded 1 hour ago
    And 1 sets of "Agachamento livre" of 10 reps with "10 kg" are recorded 170 hours ago
    When the athlete opens the app on a 320 px wide screen
    Then the day "B" should have a touch area of at least 44 px and no horizontal overflow
