import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';
// Cover business-type code presentation on vendor summaries.
import { translateBusinessType } from '../../resources/js/i18n/businessTypes.js';
import { businessTypeOptions } from '../../resources/js/i18n/businessTypes.js';
import { SYSTEM_MASTER_DATA } from '../../resources/js/i18n/systemMasterData.js';

const types = Object.entries(SYSTEM_MASTER_DATA.business_types).map(([code, record]) => ({
    code,
    ...record,
    is_active: true,
}));

// Localize fixed VMS business-type labels while preserving stored option codes.
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

// Leave unknown manual business-type values untouched.
test('unknown business-type text stays unchanged', () => {
    assert.equal(translateMessage('id', 'Custom regional entity'), 'Custom regional entity');
});

// Render known stored codes as labels while preserving custom database values.
test('business-type codes render as localized summary labels', () => {
    assert.equal(translateBusinessType('en', 'pvt_ltd', types), 'Private Limited');
    assert.equal(translateBusinessType('id', 'pvt_ltd', types), 'Perseroan Terbatas (PT)');
    assert.equal(translateBusinessType('id', 'private_limited', types), 'private_limited');
    assert.equal(translateBusinessType('id', 'Custom regional entity'), 'Custom regional entity');
    assert.equal(translateBusinessType('id', null), '-');
});

test('administrator labels and custom records stay unchanged even when matching static text', () => {
    const records = [
        { code: 'pvt_ltd', display_name: 'Administrator Label', is_active: false },
        { code: 'custom_entity', display_name: 'Partnership', is_active: true },
        { code: 'private_limited', display_name: 'private_limited', is_active: false },
    ];
    assert.deepEqual(
        businessTypeOptions('id', records),
        records.map((record) => ({ value: record.code, label: record.display_name }))
    );
    assert.equal(translateBusinessType('id', 'pvt_ltd', records), 'Administrator Label');
    assert.equal(translateBusinessType('id', 'pvt_ltd', []), 'pvt_ltd');
});
