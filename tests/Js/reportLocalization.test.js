import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const readReport = (fileName) =>
    readFileSync(
        new URL(`../../resources/js/Pages/Admin/Reports/${fileName}`, import.meta.url),
        'utf8'
    );

// Start Update 16 September 2026, by @WNP: Verify remaining static report copy is bilingual.
test('report dashboard and detail copy is localized', () => {
    const examples = [
        ['Vendor Summary', 'Ringkasan Vendor'],
        ['Audit Trail Report', 'Laporan Jejak Audit'],
        ['Compliance Rate', 'Tingkat Kepatuhan'],
        ['Compliance Evaluation', 'Evaluasi Kepatuhan'],
        ['Expiry Reminders', 'Pengingat Kedaluwarsa'],
        ['Avg Score', 'Rata-rata Skor'],
        ['Expiring in 7 Days', 'Kedaluwarsa dalam 7 Hari'],
        ['Comp. Score', 'Skor Kepatuhan'],
        ['Perf. Score', 'Skor Kinerja'],
        [
            'No reports available for your role.',
            'Tidak ada laporan yang tersedia untuk peran Anda.',
        ],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Start Update 16 September 2026, by @WNP: Guard interpolated report frames and calculated day labels.
test('report count and duration frames preserve their dynamic values', () => {
    assert.equal(
        translateMessage('id', 'Compliance Overview (:count shown)', { count: 4 }),
        'Ringkasan Kepatuhan (4 ditampilkan)'
    );
    assert.equal(
        translateMessage('id', 'Expiring Documents (:count shown)', { count: 2 }),
        'Dokumen Akan Kedaluwarsa (2 ditampilkan)'
    );
    assert.equal(
        translateMessage('id', 'Vendors (:count shown)', { count: 6 }),
        'Vendor (6 ditampilkan)'
    );
    assert.equal(translateMessage('id', ':count days', { count: 12 }), '12 hari');
});

// Start Update 16 September 2026, by @WNP: Ensure report pages translate static frames while retaining database fields.
test('report pages route static copy through the translator and preserve record values', () => {
    const index = readReport('Index.jsx');
    const compliance = readReport('ComplianceReport.jsx');
    const documents = readReport('DocumentExpiryReport.jsx');
    const vendors = readReport('VendorSummaryReport.jsx');

    assert.match(index, /\{t\(report\.title\)\}/);
    assert.match(index, /\{t\(report\.description\)\}/);
    assert.match(compliance, /t\('Compliance Overview \(:count shown\)'/);
    assert.match(documents, /t\(':count days', \{ count: daysUntil \}\)/);
    assert.match(vendors, /t\('Vendors \(:count shown\)'/);

    assert.match(documents, /row\.file_name/);
    assert.match(vendors, /row\.company_name/);
    assert.match(vendors, /row\.contact_person/);
});
