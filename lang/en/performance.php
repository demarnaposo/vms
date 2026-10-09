<?php

// Centralize English performance form validation labels and messages.
return [
    'configuration_updated' => 'Performance configuration updated.',
    'baseline' => [
        'work_quality' => ['name' => 'Work Quality', 'description' => 'Quality of the goods/services provided meets specifications'],
        'work_quantity' => ['name' => 'Work Quantity', 'description' => 'Quantity of goods/services matches the order'],
        'goods_services_price' => ['name' => 'Price of Goods/Services', 'description' => 'Assessment of how competitive the vendor’s price quotation is'],
        'goods_services_provision' => ['name' => 'Provision of Goods/Services', 'description' => 'Timeliness of goods/services delivery, including replacement goods/services or complaint handling'],
        'payment_mechanism' => ['name' => 'Mechanism', 'description' => 'Payment flexibility (payment on credit terms is possible)'],
        'invoice_delivery' => ['name' => 'Invoice Delivery', 'description' => 'Timely delivery of complete and correct invoices'],
    ],
    'metric_created' => 'Performance metric added.',
    'metric_updated' => 'Performance metric updated.',
    'metric_deleted' => 'Performance metric deleted.',
    'ratings_recorded' => 'Performance ratings recorded successfully.',

    'fields' => [
        'name' => 'metric code',
        'display_name' => 'metric name',
        'description' => 'description',
        'weight' => 'weight',
        'max_score' => 'maximum score',
        'is_active' => 'active status',

        'ratings' => 'ratings',
        'metric' => 'metric',
        'score' => 'score',
        'notes' => 'notes',
        'start_date' => 'start date',
        'end_date' => 'end date',
    ],
    'validation' => [
        'precision' => 'Use at most two decimal places for percentage weights.',
        'maximum_four' => 'Every active metric must have a maximum score of 4.',
        'total' => 'Active weights must total exactly 100%. Current total: :total%. Adjust the configuration together.',
        'stale' => 'The configuration changed. Reload the page and apply your changes again.',
        'complete_ratings' => 'Rate every active metric. Reload the form if the configuration has changed.',

        'code_immutable' => 'Metric codes cannot be changed after creation.',
        'scale_locked' => 'The maximum score of a rated metric cannot be changed. Create a new metric and deactivate the old one.',
        'metric_in_use' => 'Built-in or rated metrics cannot be deleted. Deactivate the metric instead.',
        'metric_unavailable' => 'This metric is unavailable or inactive. Reload the rating form.',
        'score_range' => 'Score must be an integer between 1 and :max.',

        'score_max' => 'Score cannot be greater than :max for the selected metric.',
        'end_after_start' => 'The end date must be a date after or equal to the start date.',
    ],
];
