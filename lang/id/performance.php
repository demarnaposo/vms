<?php

// Start Update 16 September 2026, by @WNP: Centralize Indonesian performance form validation labels and messages.
return [
    'fields' => [
        'ratings' => 'penilaian',
        'metric' => 'metrik',
        'score' => 'skor',
        'notes' => 'catatan',
        'start_date' => 'tanggal mulai',
        'end_date' => 'tanggal selesai',
    ],
    'validation' => [
        'score_max' => 'Skor tidak boleh lebih dari :max untuk metrik yang dipilih.',
        'end_after_start' => 'Tanggal selesai harus setelah atau sama dengan tanggal mulai.',
    ],
];
