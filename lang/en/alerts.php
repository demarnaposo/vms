<?php

// Keep dynamic alert copy separate from database and user-provided values.
return [
    'rbac_last_admin' => 'The last super admin cannot be removed.',
    'rbac_invalid_role' => 'Select valid staff roles.',
    'rbac_invalid_permission' => 'Select permissions from the operational catalogue.',
    'rbac_role_in_use' => 'Built-in roles and roles assigned to users cannot be deleted.',
    'rbac_user_saved' => 'Staff user saved successfully.',
    'rbac_user_deleted' => 'Staff user deleted successfully.',
    'rbac_role_saved' => 'Staff role saved successfully.',
    'rbac_role_deleted' => 'Staff role deleted successfully.',

    'vendor_decision_mail_failed' => 'The vendor status changed, but the email notification could not be processed.',
    'notification_sent' => 'Notification sent to :count recipient(s).',
    'contact_message_sent' => 'Thank you for your message! We\'ll get back to you soon.',
    'contact_message_failed' => 'Your message could not be sent. Please try again.',
    // Centralize notification-center success feedback.
    'notifications_marked_read' => 'All notifications marked as read.',
    // Explain throttled form actions without leaving the current page.
    'too_many_requests' => 'Too many actions were submitted. Please wait a moment and try again.',
    'document_verified' => ':document verified successfully.',
    'document_rejected' => ':document rejected.',
    'document_pending_current_only' => 'Only the current pending document can be reviewed.',
    'account_deletion_has_history' => 'This account has a history that must be retained and cannot be deleted. Please contact support.',
    'vendor_account_status' => 'Your vendor account is currently :status. Please contact support.',
    'user_account_inactive' => 'Your account is inactive. Please contact support.',
    'vendor_not_compliant' => 'Vendor is not compliant (Status: :status). Please resolve compliance issues first.',
    'vendor_transition' => 'Vendor cannot be :action from :status state.',
    // Keep lifecycle action and readiness alert copy translatable.
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
