import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SYSTEM_MASTER_DATA,
    translateSystemMasterDataField,
} from '../../resources/js/i18n/systemMasterData.js';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify every display-oriented VMS master-data category is registered centrally.
test('registers all display-oriented system master-data categories', () => {
    assert.deepEqual(Object.keys(SYSTEM_MASTER_DATA), [
        'roles',
        'permissions',
        'vendor_states',
        'document_types',
        'compliance_rules',
        'performance_metrics',
    ]);
    assert.equal(Object.keys(SYSTEM_MASTER_DATA.roles).length, 4);
    assert.equal(Object.keys(SYSTEM_MASTER_DATA.permissions).length, 21);
    assert.equal(Object.keys(SYSTEM_MASTER_DATA.vendor_states).length, 8);
    assert.equal(Object.keys(SYSTEM_MASTER_DATA.document_types).length, 7);
    assert.equal(Object.keys(SYSTEM_MASTER_DATA.compliance_rules).length, 3);
    assert.equal(Object.keys(SYSTEM_MASTER_DATA.performance_metrics).length, 4);
});

// Start Update 15 September 2026, by @WNP: Ensure every registered master label and description has an Indonesian display value.
test('all registered master-data text has Indonesian coverage', () => {
    const intentionallySharedTerms = new Set(['Vendor']);

    for (const records of Object.values(SYSTEM_MASTER_DATA)) {
        for (const definition of Object.values(records)) {
            for (const source of Object.values(definition)) {
                const translated = translateMessage('id', source);
                if (!intentionallySharedTerms.has(source)) {
                    assert.notEqual(
                        translated,
                        source,
                        `Missing Indonesian translation for: ${source}`
                    );
                }
            }
        }
    }
});

// Start Update 15 September 2026, by @WNP: Verify representative fixed records translate by stable name without changing their codes.
test('translates fixed records from every master-data category', () => {
    const examples = [
        ['roles', 'ops_manager', 'display_name', 'Manajer Operasional'],
        ['roles', 'ops_manager', 'description', 'Pendaftaran vendor dan verifikasi dokumen'],
        ['permissions', 'documents.verify', 'display_name', 'Verifikasi Dokumen'],
        ['vendor_states', 'under_review', 'display_name', 'Sedang Ditinjau'],
        ['compliance_rules', 'minimum_performance', 'display_name', 'Kinerja Minimum'],
        [
            'compliance_rules',
            'minimum_performance',
            'description',
            'Skor kinerja vendor minimal harus 40',
        ],
        [
            'performance_metrics',
            'delivery_timeliness',
            'display_name',
            'Ketepatan Waktu Pengiriman',
        ],
        [
            'performance_metrics',
            'delivery_timeliness',
            'description',
            'Konsistensi vendor dalam memenuhi tenggat pengiriman',
        ],
    ];

    for (const [category, name, field, expected] of examples) {
        const record = { name };
        assert.equal(translateSystemMasterDataField('id', category, record, field), expected);
        assert.equal(record.name, name);
    }
});

// Start Update 15 September 2026, by @WNP: Keep custom records, technical mappings, and user-entered values outside automatic translation.
test('preserves unknown database master records verbatim', () => {
    const customMetric = {
        name: 'custom_metric',
        display_name: 'Regional Quality Index',
        description: 'Configured manually',
    };

    assert.equal(
        translateSystemMasterDataField('id', 'performance_metrics', customMetric, 'display_name'),
        'Regional Quality Index'
    );
    assert.equal(
        translateSystemMasterDataField('id', 'performance_metrics', customMetric, 'description'),
        'Configured manually'
    );
    assert.equal(
        translateSystemMasterDataField(
            'id',
            'performance_metrics',
            { name: 'toString', display_name: 'Manual Prototype-like Name' },
            'display_name'
        ),
        'Manual Prototype-like Name'
    );
});
