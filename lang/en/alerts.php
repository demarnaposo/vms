<?php

// Start Update 12 September 2026, by @WNP: Keep dynamic alert copy separate from database and user-provided values.
return [
    'notification_sent' => 'Notification sent to :count recipient(s).',
    'document_verified' => ':document verified successfully.',
    'document_rejected' => ':document rejected.',
    'vendor_account_status' => 'Your vendor account is currently :status. Please contact support.',
    'vendor_not_compliant' => 'Vendor is not compliant (Status: :status). Please resolve compliance issues first.',
    'vendor_transition' => 'Vendor cannot be :action from :status state.',
    // Start Update 12 September 2026, by @WNP: Keep lifecycle action and readiness alert copy translatable.
    'actions' => [
        'approved' => 'approved',
        'rejected' => 'rejected',
        'activated' => 'activated',
        'suspended' => 'suspended',
        'terminated' => 'terminated',
        'reactivated' => 'reactivated',
    ],
    'termination_reason_required' => 'A reason is required when terminating a vendor.',
    'reactivation_reason_required' => 'A reason is required when reactivating a vendor.',
    'documents_required_for_activation' => 'Vendor cannot be activated until all mandatory documents are verified and valid.',
    'compliance_required_for_activation' => 'Vendor cannot be activated until compliance score meets the activation threshold.',
    'flags_block_activation' => 'Vendor cannot be activated while compliance flags are unresolved.',
    'document_upload_missing' => "Document upload failed: File ':file' not found. Please re-upload.",
];
