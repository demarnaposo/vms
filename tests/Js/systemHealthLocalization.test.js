import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const source = readFileSync(
    new URL('../../resources/js/Pages/Admin/SystemHealth/Index.jsx', import.meta.url),
    'utf8'
);

// Start Update 16 September 2026, by @WNP: Verify all fixed system-health labels are bilingual.
test('system health static copy is localized', () => {
    const examples = [
        ['System Health', 'Kesehatan Sistem'],
        ['Total Jobs', 'Total Pekerjaan'],
        ['Successful', 'Berhasil'],
        ['Job', 'Pekerjaan'],
        ['Started', 'Dimulai'],
        ['Duration', 'Durasi'],
        ['Finished', 'Selesai'],
        ['Error', 'Kesalahan'],
        ['Job Name', 'Nama Pekerjaan'],
        ['Apply', 'Terapkan'],
        ['\u00AB Previous', '\u00AB Sebelumnya'],
        ['Next \u00BB', 'Lanjut \u00BB'],
    ];

    for (const [english, indonesian] of examples) {
        assert.equal(translateMessage('id', english), indonesian);
        assert.equal(translateMessage('en', english), english);
    }
});

// Start Update 16 September 2026, by @WNP: Guard UI translation while preserving technical log data verbatim.
test('system health translates static controls and preserves job log fields', () => {
    assert.match(source, /const \{ t \} = useLanguage\(\)/);
    assert.match(source, /\{t\('Job Name'\)\}/);
    assert.match(source, /\{t\(formatPaginationLabel\(link\.label\)\)\}/);

    assert.match(source, /\{row\.job_name\}/);
    assert.match(source, /row\.error_message/);
    assert.match(source, /placeholder="vendors:evaluate-compliance"/);
});
