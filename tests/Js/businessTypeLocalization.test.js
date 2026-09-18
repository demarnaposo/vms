import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';
// Start Update 16 September 2026, by @WNP: Cover business-type code presentation on vendor summaries.
import { translateBusinessType } from '../../resources/js/i18n/businessTypes.js';

// Start Update 14 September 2026, by @WNP: Localize fixed VMS business-type labels while preserving stored option codes.
test('business-type choices translate without changing their values', () => {
    const choices = [
        ['sole_proprietor', 'Sole Proprietorship', 'Usaha Perseorangan'],
        ['partnership', 'Partnership', 'Kemitraan'],
        ['llp', 'LLP', 'Kemitraan Tanggung Jawab Terbatas (LLP)'],
        ['pvt_ltd', 'Private Limited', 'Perseroan Terbatas (PT)'],
        ['public_ltd', 'Public Limited', 'Perseroan Terbatas Terbuka (Tbk)'],
    ];

    for (const [value, englishLabel, indonesianLabel] of choices) {
        assert.equal(translateMessage('id', englishLabel), indonesianLabel);
        assert.equal(translateMessage('en', englishLabel), englishLabel);
        assert.equal(translateMessage('id', value), value);
    }
});

// Start Update 14 September 2026, by @WNP: Leave unknown manual business-type values untouched.
test('unknown business-type text stays unchanged', () => {
    assert.equal(translateMessage('id', 'Custom regional entity'), 'Custom regional entity');
});

// Start Update 16 September 2026, by @WNP: Render known stored codes as labels while preserving custom database values.
test('business-type codes render as localized summary labels', () => {
    assert.equal(translateBusinessType('en', 'pvt_ltd'), 'Private Limited');
    assert.equal(translateBusinessType('id', 'pvt_ltd'), 'Perseroan Terbatas (PT)');
    assert.equal(translateBusinessType('id', 'private_limited'), 'Perseroan Terbatas (PT)');
    assert.equal(translateBusinessType('id', 'Custom regional entity'), 'Custom regional entity');
    assert.equal(translateBusinessType('id', null), '-');
});
