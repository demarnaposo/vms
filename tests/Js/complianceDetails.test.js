import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateComplianceDetails } from '../../resources/js/i18n/complianceDetails.js';

// Start Update 16 September 2026, by @WNP: Verify known automatic compliance details translate with dynamic values intact.
test('translates system-generated compliance result details', () => {
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'mandatory_documents' },
            'All mandatory documents are verified.'
        ),
        'Semua dokumen wajib telah diverifikasi.'
    );
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'mandatory_documents' },
            'Missing mandatory documents: NPWP Document, Regional Permit'
        ),
        'Dokumen wajib yang belum terpenuhi: Dokumen Nomor Pokok Wajib Pajak (NPWP), Regional Permit'
    );
    assert.equal(
        translateComplianceDetails(
            'en',
            { name: 'mandatory_documents' },
            'Missing mandatory documents: NIB Document'
        ),
        'Missing mandatory documents: Business Identification Number (NIB) Document'
    );
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'document_expiry_check' },
            'Expired documents: Insurance Certificate'
        ),
        'Dokumen kedaluwarsa: Sertifikat Asuransi'
    );
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'document_expiry_check' },
            'Documents expiring soon: Service Agreement'
        ),
        'Dokumen akan segera kedaluwarsa: Perjanjian Layanan'
    );
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'document_expiry_check' },
            'No document expiry issues.'
        ),
        'Tidak ada masalah kedaluwarsa dokumen.'
    );
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'minimum_performance' },
            'Performance score (90) meets threshold (80).'
        ),
        'Skor kinerja (90) memenuhi ambang batas (80).'
    );
    assert.equal(
        translateComplianceDetails(
            'id',
            { name: 'minimum_performance' },
            'Performance score (40) below threshold (80).'
        ),
        'Skor kinerja (40) berada di bawah ambang batas (80).'
    );
});

// Start Update 16 September 2026, by @WNP: Preserve English output, custom rules, and unrecognized stored detail text.
test('preserves custom and unknown compliance details verbatim', () => {
    const manualDetail = 'Reviewed manually by the compliance team.';
    const automaticDetail = 'All mandatory documents are verified.';

    assert.equal(
        translateComplianceDetails('id', { name: 'custom_rule' }, automaticDetail),
        automaticDetail
    );
    assert.equal(
        translateComplianceDetails('id', { name: 'mandatory_documents' }, manualDetail),
        manualDetail
    );
    assert.equal(
        translateComplianceDetails('en', { name: 'mandatory_documents' }, automaticDetail),
        automaticDetail
    );
});

// Start Update 16 September 2026, by @WNP: Guard every compliance-result surface that displays automatic details.
test('compliance pages use the centralized detail translator', () => {
    const files = [
        'Pages/Vendor/Compliance.jsx',
        'Pages/Admin/Vendors/Show.jsx',
        'Pages/Admin/Compliance/Dashboard.jsx',
        'Pages/Admin/Compliance/VendorDetail.jsx',
    ];

    for (const file of files) {
        const source = readFileSync(new URL(`../../resources/js/${file}`, import.meta.url), 'utf8');
        assert.match(
            source,
            /translateComplianceDetails\(/,
            `${file} must translate result details`
        );
    }
});
