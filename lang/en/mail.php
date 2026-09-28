<?php

return [
    'vendor_decision' => [
        'approved' => [
            'subject' => 'Your VMS vendor application has been approved',
            'intro' => 'Your vendor application for :company has been approved.',
            'next' => 'Approval does not activate your vendor account. Activation is a separate step after the requirements are met.',
            'action' => 'View Vendor Dashboard',
        ],
        'rejected' => [
            'subject' => 'Your VMS vendor application has been rejected',
            'intro' => 'Your vendor application for :company has been rejected.',
            'reason' => 'Reason:',
        ],
    ],
    'vendor_application' => [
        'subject' => 'New Vendor Application: :company',
        'intro' => 'A new vendor application has been submitted.',
        'company' => 'Company: :company',
        'submitted_by' => 'Submitted by: :name',
        'action' => 'Review Application',
    ],
];
