import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const ratePageSource = readFileSync(
    new URL('../../resources/js/Pages/Admin/Performance/Rate.jsx', import.meta.url),
    'utf8'
);

// Start Update 13 September 2026, by @WNP: Verify fixed performance labels follow the selected language.
test('performance labels and count frames are localized without changing their values', () => {
    assert.equal(translateMessage('id', 'Performance Dashboard'), 'Dasbor Kinerja');
    assert.equal(translateMessage('id', 'Top Performers'), 'Vendor Berkinerja Terbaik');
    assert.equal(translateMessage('id', 'Excellent'), 'Sangat Baik');
    assert.equal(translateMessage('id', 'Weight: :weight%', { weight: 25 }), 'Bobot: 25%');
    assert.equal(
        translateMessage('id', 'Performance Rankings (:count shown)', { count: 3 }),
        'Peringkat Kinerja (3 ditampilkan)'
    );
    assert.equal(translateMessage('en', 'Top Performers'), 'Top Performers');
});

// Start Update 13 September 2026, by @WNP: Guard free-text metric names and rating notes from automatic translation.
test('performance database free text remains unchanged', () => {
    assert.equal(translateMessage('id', 'Custom delivery metric'), 'Custom delivery metric');
    assert.equal(
        translateMessage('id', 'Late due to supplier issue'),
        'Late due to supplier issue'
    );
});

// Start Update 16 September 2026, by @WNP: Ensure rating-period labels use the shared translator in the form.
test('performance rating period labels are localized', () => {
    assert.equal(translateMessage('id', 'Start Date'), 'Tanggal Mulai');
    assert.equal(translateMessage('id', 'End Date'), 'Tanggal Selesai');
    assert.match(ratePageSource, /\{t\('Start Date'\)\}/);
    assert.match(ratePageSource, /\{t\('End Date'\)\}/);
    assert.match(ratePageSource, /Object\.values\(form\.errors\)/);
    assert.match(ratePageSource, /validationErrors\.map/);
});
