<?php

// Start Update 12 September 2026, by @WNP: Define English evaluation alerts with named dynamic values.
return [
    'evaluated' => 'Compliance evaluated. Score: :score, Status: :status',
    'evaluation_completed' => 'Compliance evaluation completed for :count vendors.',
    // Start Update 16 September 2026, by @WNP: Provide visible feedback when an evaluation cannot be completed.
    'evaluation_failed' => 'Compliance evaluation could not be completed. Please try again.',
    // Start Update 13 September 2026, by @WNP: Show readable labels for system compliance status codes in alerts.
    'statuses' => [
        'pending' => 'Pending',
        'compliant' => 'Compliant',
        'at_risk' => 'At Risk',
        'non_compliant' => 'Non-Compliant',
        'blocked' => 'Blocked',
    ],
];
