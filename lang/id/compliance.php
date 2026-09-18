<?php

// Start Update 13 September 2026, by @WNP: Define Indonesian evaluation alerts with translated system status labels.
return [
    'evaluated' => 'Kepatuhan berhasil dievaluasi. Skor: :score, Status: :status',
    'evaluation_completed' => 'Evaluasi kepatuhan selesai untuk :count vendor.',
    // Start Update 16 September 2026, by @WNP: Provide localized feedback when an evaluation cannot be completed.
    'evaluation_failed' => 'Evaluasi kepatuhan tidak dapat diselesaikan. Silakan coba lagi.',
    'statuses' => [
        'pending' => 'Menunggu',
        'compliant' => 'Patuh',
        'at_risk' => 'Berisiko',
        'non_compliant' => 'Tidak Patuh',
        'blocked' => 'Diblokir',
    ],
];
