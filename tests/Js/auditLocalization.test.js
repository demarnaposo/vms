import test from 'node:test';
import assert from 'node:assert/strict';
import { translateAuditEntity, translateAuditEvent } from '../../resources/js/i18n/auditLabels.js';

// Start Update 13 September 2026, by @WNP: Verify known audit event codes use display-only Indonesian labels.
test('translates only known system audit events', () => {
    assert.equal(translateAuditEvent('id', 'created'), 'Dibuat');
    assert.equal(translateAuditEvent('id', 'state_changed'), 'Status Diubah');
    assert.equal(translateAuditEvent('id', 'scored'), 'Kinerja Dinilai');
    assert.equal(translateAuditEvent('en', 'state_changed'), 'Status Changed');
    assert.equal(translateAuditEvent('id', 'custom_manual_event'), 'custom_manual_event');
});

// Start Update 13 September 2026, by @WNP: Keep unknown morph types untouched and leave stored class names unmodified.
test('translates only known audit entity class labels', () => {
    const paymentType = 'App\\Models\\PaymentRequest';
    assert.equal(translateAuditEntity('id', paymentType), 'Permintaan Pembayaran');
    assert.equal(translateAuditEntity('en', paymentType), 'Payment Request');
    assert.equal(translateAuditEntity('id', 'App\\Models\\CustomRecord'), 'CustomRecord');
    assert.equal(translateAuditEntity('id', 'Other\\Models\\PaymentRequest'), 'PaymentRequest');
});
