import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 13 September 2026, by @WNP: Cover migration-backed enum labels without translating persisted codes or manual text.
test('Indonesian labels cover UI-visible migration enums', () => {
    const codes = [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'active',
        'suspended',
        'terminated',
        'rejected',
        'pending',
        'compliant',
        'at_risk',
        'non_compliant',
        'blocked',
        'verified',
        'expired',
        'requested',
        'pending_ops',
        'pending_finance',
        'paid',
        'cancelled',
        'pass',
        'fail',
        'warning',
        'low',
        'medium',
        'high',
        'critical',
        'document_required',
        'document_expiry',
        'performance_threshold',
        'custom',
        'ops_validation',
        'finance_approval',
        'new',
        'read',
        'replied',
        'closed',
        'abandoned',
    ];

    for (const code of codes) {
        const label = code.replaceAll('_', ' ');
        assert.notEqual(translateMessage('id', label), label, `${code} lacks an Indonesian label`);
        assert.equal(translateMessage('en', label), label);
    }
});

// Start Update 13 September 2026, by @WNP: Unknown database content must remain untouched by the shared translator.
test('manual input and seeded descriptions remain verbatim without an exact static key', () => {
    for (const text of [
        'Contract approved after legal review',
        'Custom vendor document name',
        'Please call the Bandung branch',
    ]) {
        assert.equal(translateMessage('id', text), text);
    }
});
