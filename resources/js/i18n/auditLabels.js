import { translateMessage } from './translations.js';

// Allow only application-defined audit event codes to use localized labels.
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

// Map known model class names to UI labels without changing stored morph types.
const AUDIT_ENTITY_LABELS = Object.freeze({
    'App\\Models\\Vendor': 'Vendor',
    'App\\Models\\VendorDocument': 'Vendor Document',
    'App\\Models\\PaymentRequest': 'Payment Request',
    'App\\Models\\ContactMessage': 'Contact Message',
    'App\\Models\\User': 'User',
});

// Translate application-generated descriptions without changing staff-entered audit reasons.
const AUDIT_DESCRIPTION_LABELS = new Set([
    'Vendor application submitted for review',
    'Vendor approved and activated',
    'Vendor approved',
    'Vendor moved to review before rejection',
    'Vendor activated',
    'Admin reviewed termination appeal and restored access.',
    'Internal staff user created',
    'Contact message soft-deleted by staff',
]);

// Preserve unknown custom event codes verbatim.
export function translateAuditEvent(language, event) {
    if (typeof event !== 'string') return event;

    const label = AUDIT_EVENT_LABELS[event];
    return label ? translateMessage(language, label) : event;
}

// Translate only known entity classes; leave unknown audit subjects readable and unchanged.
export function translateAuditEntity(language, auditableType) {
    if (typeof auditableType !== 'string') return auditableType;

    const className = auditableType.split('\\').pop();
    const label = AUDIT_ENTITY_LABELS[auditableType];
    return label ? translateMessage(language, label) : className;
}

// Preserve custom reasons verbatim and localize only descriptions emitted by VMS.
export function translateAuditDescription(language, description) {
    if (typeof description !== 'string') return description;

    return AUDIT_DESCRIPTION_LABELS.has(description)
        ? translateMessage(language, description)
        : description;
}
