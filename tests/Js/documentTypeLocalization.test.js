import test from 'node:test';
import assert from 'node:assert/strict';
import {
    translateDocumentTypeDescription,
    translateDocumentTypeLabel,
} from '../../resources/js/i18n/documentTypes.js';

// Start Update 15 September 2026, by @WNP: Verify fixed system document types follow the selected display language.
test('translates document types sourced from system master data', () => {
    const examples = [
        ['company_registration', 'Sertifikat Pendaftaran Perusahaan'],
        ['gst_certificate', 'Sertifikat Registrasi GST'],
        ['pan_card', 'Kartu PAN'],
        ['cancelled_cheque', 'Cek yang Dibatalkan'],
        ['insurance', 'Sertifikat Asuransi'],
        ['nda', 'Perjanjian Kerahasiaan'],
        ['service_agreement', 'Perjanjian Layanan'],
    ];

    for (const [name, expectedLabel] of examples) {
        assert.equal(translateDocumentTypeLabel('id', { name }), expectedLabel);
    }

    const companyRegistration = {
        name: 'company_registration',
        display_name: 'Company Registration Certificate',
        description: 'Certificate of incorporation or business registration',
    };

    assert.equal(
        translateDocumentTypeDescription('id', companyRegistration),
        'Sertifikat pendirian atau pendaftaran usaha'
    );
    assert.equal(
        translateDocumentTypeLabel('en', companyRegistration),
        'Company Registration Certificate'
    );
});

// Start Update 15 September 2026, by @WNP: Preserve administrator-created document types and descriptions verbatim.
test('does not translate custom database document types', () => {
    const customType = {
        name: 'regional_permit',
        display_name: 'Izin Operasional Jakarta',
        description: 'Diisi manual oleh admin',
    };

    assert.equal(translateDocumentTypeLabel('id', customType), 'Izin Operasional Jakarta');
    assert.equal(translateDocumentTypeDescription('id', customType), 'Diisi manual oleh admin');
});
