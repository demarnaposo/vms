<?php

// Start Update 16 September 2026, by @WNP: Centralize English performance form validation labels and messages.
return [
    'fields' => [
        'ratings' => 'ratings',
        'metric' => 'metric',
        'score' => 'score',
        'notes' => 'notes',
        'start_date' => 'start date',
        'end_date' => 'end date',
    ],
    'validation' => [
        'score_max' => 'Score cannot be greater than :max for the selected metric.',
        'end_after_start' => 'The end date must be a date after or equal to the start date.',
    ],
];
