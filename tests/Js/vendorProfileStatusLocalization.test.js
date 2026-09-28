import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateSystemMasterDataField } from '../../resources/js/i18n/systemMasterData.js';

const statusLabel = (language, status) =>
    translateSystemMasterDataField(
        language,
        'vendor_states',
        { name: status },
        'display_name',
        status.replaceAll('_', ' ')
    );

test('vendor status labels follow the active language without changing their codes', () => {
    const statuses = [
        ['draft', 'Draft', 'Draf'],
        ['submitted', 'Submitted', 'Diajukan'],
        ['under_review', 'Under Review', 'Sedang Ditinjau'],
        ['approved', 'Approved', 'Disetujui'],
        ['active', 'Active', 'Aktif'],
        ['suspended', 'Suspended', 'Ditangguhkan'],
        ['terminated', 'Terminated', 'Dihentikan'],
        ['rejected', 'Rejected', 'Ditolak'],
    ];

    for (const [code, english, indonesian] of statuses) {
        const record = { name: code };

        assert.equal(
            translateSystemMasterDataField('en', 'vendor_states', record, 'display_name'),
            english
        );
        assert.equal(
            translateSystemMasterDataField('id', 'vendor_states', record, 'display_name'),
            indonesian
        );
        assert.equal(record.name, code);
    }
});

test('unknown vendor statuses use a readable untranslated fallback', () => {
    assert.equal(statusLabel('en', 'custom_status'), 'custom status');
    assert.equal(statusLabel('id', 'custom_status'), 'custom status');
});

test('vendor profile renders the shared status label while preserving Badge status styling', () => {
    const source = readFileSync(
        new URL('../../resources/js/Pages/Vendor/Profile.jsx', import.meta.url),
        'utf8'
    );

    assert.match(source, /'vendor_states'/);
    assert.match(source, /\{vendorStatusLabel\}/);
    assert.match(source, /status=\{vendorStatus\}/);
    assert.match(source, /translateLabel=\{false\}/);
    assert.doesNotMatch(source, /vendor\?\.status\?\.replaceAll/);
});
