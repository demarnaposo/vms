import test from 'node:test';
import assert from 'node:assert/strict';
import {
    translateDocumentTypeDescription,
    translateDocumentTypeLabel,
} from '../../resources/js/i18n/documentTypes.js';

// Verify fixed system document types follow the selected display language.
test('translates document types sourced from system master data', () => {
    const examples = [
        ['company_registration', 'Sertifikat Pendaftaran Perusahaan'],
        // Expect Indonesian identification and bank-proof master labels.
        ['gst_certificate', 'NPWP Perusahaan'],
        ['pan_card', 'NIB OSS'],
        ['cancelled_cheque', 'Bukti Rekening Bank'],
        ['npwp', 'NPWP Perusahaan'],
        ['nib_oss', 'NIB OSS'],
        ['bank_account_proof', 'Bukti Rekening Bank'],
        ['insurance', 'Sertifikat Asuransi'],
        ['nda', 'Perjanjian Kerahasiaan'],
        ['service_agreement', 'Perjanjian Layanan'],
        ['company_deed', 'Akta Pendirian Perusahaan'],
        ['domicile_letter', 'Surat Domisili'],
        ['pic_identity_card', 'KTP PIC'],
        ['bank_account_letter', 'Surat Keterangan Rekening Bank'],
        ['experience_portfolio', 'Portofolio Pengalaman'],
        ['business_license', 'SIUP / Izin Usaha'],
        ['pkp_certificate', 'Sertifikat PKP (jika PKP)'],
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

test('renamed codes preserve bilingual metadata and custom labels for either spelling', () => {
    for (const [legacy, canonical, display_name] of [
        ['gst_certificate', 'npwp', 'Taxpayer Identification Number (NPWP) Document'],
        ['pan_card', 'nib_oss', 'Business Identification Number (NIB) Document'],
        ['cancelled_cheque', 'bank_account_proof', 'Bank Account Proof'],
    ]) {
        const old = { name: legacy, display_name };
        const current = { name: canonical, display_name };
        for (const language of ['en', 'id']) {
            assert.equal(
                translateDocumentTypeLabel(language, old),
                translateDocumentTypeLabel(language, current)
            );
            assert.equal(
                translateDocumentTypeLabel(language, { ...current, display_name: 'Admin label' }),
                'Admin label'
            );
        }
        assert.equal(old.name, legacy);
        assert.equal(current.name, canonical);
    }
});

test('new document descriptions are bilingual and administrator labels remain verbatim', () => {
    const type = {
        name: 'pkp_certificate',
        display_name: 'PKP Certificate (if applicable)',
        description: 'Optional certificate for vendors registered as PKP',
    };
    assert.equal(
        translateDocumentTypeDescription('id', type),
        'Sertifikat opsional bagi vendor yang terdaftar sebagai PKP'
    );
    assert.equal(translateDocumentTypeDescription('en', type), type.description);
    type.display_name = 'Label khusus admin';
    type.description = 'Catatan khusus admin';
    for (const language of ['en', 'id']) {
        assert.equal(translateDocumentTypeLabel(language, type), type.display_name);
        assert.equal(translateDocumentTypeDescription(language, type), type.description);
    }
});

// Preserve administrator-created document types and descriptions verbatim.
test('does not translate custom database document types', () => {
    const customType = {
        name: 'regional_permit',
        display_name: 'Izin Operasional Jakarta',
        description: 'Diisi manual oleh admin',
    };

    assert.equal(translateDocumentTypeLabel('id', customType), 'Izin Operasional Jakarta');
    assert.equal(translateDocumentTypeDescription('id', customType), 'Diisi manual oleh admin');
});
