import test from 'node:test';
import assert from 'node:assert/strict';
import {
    translateAuditDescription,
    translateAuditEntity,
    translateAuditEvent,
} from '../../resources/js/i18n/auditLabels.js';

// Verify known audit event codes use display-only Indonesian labels.
test('translates only known system audit events', () => {
    assert.equal(translateAuditEvent('id', 'created'), 'Dibuat');
    assert.equal(translateAuditEvent('id', 'state_changed'), 'Status Diubah');
    assert.equal(translateAuditEvent('id', 'scored'), 'Kinerja Dinilai');
    assert.equal(translateAuditEvent('en', 'state_changed'), 'Status Changed');
    assert.equal(translateAuditEvent('id', 'custom_manual_event'), 'custom_manual_event');
});

// Keep unknown morph types untouched and leave stored class names unmodified.
test('translates only known audit entity class labels', () => {
    const paymentType = 'App\\Models\\PaymentRequest';
    assert.equal(translateAuditEntity('id', paymentType), 'Permintaan Pembayaran');
    assert.equal(translateAuditEntity('en', paymentType), 'Payment Request');
    assert.equal(translateAuditEntity('id', 'App\\Models\\CustomRecord'), 'CustomRecord');
    assert.equal(translateAuditEntity('id', 'Other\\Models\\PaymentRequest'), 'PaymentRequest');
});

// Localize every application-generated description without modifying manual audit reasons.
test('translates only known system audit descriptions', () => {
    const descriptions = [
        ['Vendor application submitted for review', 'Pengajuan vendor dikirim untuk ditinjau'],
        ['Vendor approved and activated', 'Vendor disetujui dan diaktifkan'],
        ['Vendor approved', 'Vendor disetujui'],
        [
            'Vendor moved to review before rejection',
            'Vendor dipindahkan ke peninjauan sebelum ditolak',
        ],
        ['Vendor activated', 'Vendor diaktifkan'],
        [
            'Admin reviewed termination appeal and restored access.',
            'Admin meninjau banding penghentian dan memulihkan akses.',
        ],
        ['Internal staff user created', 'Pengguna internal dibuat'],
        ['Contact message soft-deleted by staff', 'Pesan kontak dihapus sementara oleh staf'],
    ];

    for (const [source, translation] of descriptions) {
        assert.equal(translateAuditDescription('id', source), translation);
    }

    assert.equal(
        translateAuditDescription('en', 'Internal staff user created'),
        'Internal staff user created'
    );
    assert.equal(
        translateAuditDescription('id', 'Alasan khusus dari staf'),
        'Alasan khusus dari staf'
    );
});
