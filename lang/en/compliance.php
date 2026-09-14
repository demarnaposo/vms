<?php

// Start Update 12 September 2026, by @WNP: Define English evaluation alerts with named dynamic values.
return [
    'evaluated' => 'Compliance evaluated. Score: :score, Status: :status',
    'evaluation_completed' => 'Compliance evaluation completed for :count vendors.',
    // Start Update 13 September 2026, by @WNP: Show readable labels for system compliance status codes in alerts.
    'statuses' => [
        'pending' => 'Pending',
        'compliant' => 'Compliant',
        'at_risk' => 'At Risk',
        'non_compliant' => 'Non-Compliant',
        'blocked' => 'Blocked',
    ],
];
