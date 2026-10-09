import test from 'node:test';
import assert from 'node:assert/strict';
import {
    translateDocumentTypeDescription,
    translateDocumentTypeLabel,
} from '../../resources/js/i18n/documentTypes.js';

// Verify fixed system document types follow the selected display language.
test('translates document types sourced from system master data', () => {
    const examples = [
        ['company_profile', 'Profil Perusahaan'],
        ['company_registration', 'Sertifikat Pendaftaran Perusahaan'],
        // Expect Indonesian identification and bank-proof master labels.
        ['gst_certificate', 'NPWP (Nomor Pokok Wajib Pajak)'],
        ['pan_card', 'NIB/OSS (Nomor Induk Berusaha)'],
        ['cancelled_cheque', 'Bukti Rekening Bank'],
        ['npwp', 'NPWP (Nomor Pokok Wajib Pajak)'],
        ['nib_oss', 'NIB/OSS (Nomor Induk Berusaha)'],
        ['bank_account_proof', 'Bukti Rekening Bank'],
        ['insurance', 'Sertifikat Asuransi'],
        ['nda', 'Perjanjian Kerahasiaan'],
        ['service_agreement', 'Perjanjian Layanan'],
        ['company_deed', 'Akta Pendirian Usaha'],
        ['domicile_letter', 'Surat Keterangan Domisili Perusahaan'],
        ['pic_identity_card', 'KTP Pemilik/Pejabat Perusahaan'],
        ['bank_account_letter', 'Surat Keterangan Rekening Bank'],
        ['experience_portfolio', 'Portofolio Pengalaman'],
        ['business_license', 'SIUP / Izin Usaha'],
        ['pkp_certificate', 'Pengukuhan Pengusaha Kena Pajak (SPPKP)'],
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

test('company profile is bilingual while custom records and administrator edits stay verbatim', () => {
    const builtin = {
        name: 'company_profile',
        display_name: 'Company Profile',
        description: 'Company overview and capabilities',
    };
    const original = { ...builtin };
    assert.equal(translateDocumentTypeLabel('id', builtin), 'Profil Perusahaan');
    assert.equal(translateDocumentTypeLabel('en', builtin), 'Company Profile');
    assert.equal(
        translateDocumentTypeDescription('id', builtin),
        'Gambaran umum dan kemampuan perusahaan'
    );
    assert.equal(translateDocumentTypeDescription('en', builtin), builtin.description);
    assert.deepEqual(builtin, original);

    for (const language of ['id', 'en']) {
        const custom = { ...builtin, name: 'custom_company_profile' };
        assert.equal(translateDocumentTypeLabel(language, custom), 'Company Profile');
        assert.equal(translateDocumentTypeDescription(language, custom), custom.description);
        assert.equal(
            translateDocumentTypeLabel(language, {
                ...builtin,
                display_name: 'Manual Company Profile',
            }),
            'Manual Company Profile'
        );
        assert.equal(
            translateDocumentTypeDescription(language, {
                ...builtin,
                description: 'Manual description',
            }),
            'Manual description'
        );
        assert.equal(
            translateDocumentTypeLabel(language, { name: 'unknown_type' }, 'Fallback'),
            'Fallback'
        );
    }
});

test('renamed codes preserve bilingual metadata and custom labels for either spelling', () => {
    for (const [legacy, canonical, display_name] of [
        ['gst_certificate', 'npwp', 'NPWP (Taxpayer Identification Number)'],
        ['pan_card', 'nib_oss', 'NIB/OSS (Business Identification Number)'],
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
        display_name: 'Taxable Entrepreneur Confirmation (SPPKP)',
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
