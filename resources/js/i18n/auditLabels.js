import { translateMessage } from './translations.js';

// Start Update 13 September 2026, by @WNP: Allow only application-defined audit event codes to use localized labels.
const AUDIT_EVENT_LABELS = Object.freeze({
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    state_changed: 'Status Changed',
    approved: 'Approved',
    rejected: 'Rejected',
    uploaded: 'Document Uploaded',
    verified: 'Verified',
    scored: 'Performance Scored',
});

// Start Update 13 September 2026, by @WNP: Map known model class names to UI labels without changing stored morph types.
const AUDIT_ENTITY_LABELS = Object.freeze({
    'App\\Models\\Vendor': 'Vendor',
    'App\\Models\\VendorDocument': 'Vendor Document',
    'App\\Models\\PaymentRequest': 'Payment Request',
    'App\\Models\\ContactMessage': 'Contact Message',
    'App\\Models\\User': 'User',
});

// Start Update 13 September 2026, by @WNP: Preserve unknown custom event codes verbatim.
export function translateAuditEvent(language, event) {
    if (typeof event !== 'string') return event;

    const label = AUDIT_EVENT_LABELS[event];
    return label ? translateMessage(language, label) : event;
}

// Start Update 13 September 2026, by @WNP: Translate only known entity classes; leave unknown audit subjects readable and unchanged.
export function translateAuditEntity(language, auditableType) {
    if (typeof auditableType !== 'string') return auditableType;

    const className = auditableType.split('\\').pop();
    const label = AUDIT_ENTITY_LABELS[auditableType];
    return label ? translateMessage(language, label) : className;
}
