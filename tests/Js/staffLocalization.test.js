import test from 'node:test';
import assert from 'node:assert/strict';
import { translateStaffRoleOption } from '../../resources/js/i18n/staffRoles.js';
import { translateMessage } from '../../resources/js/i18n/translations.js';
import { readFileSync } from 'node:fs';
import {
    translateStaffPermissionField,
    translateStaffPermissionGroup,
} from '../../resources/js/i18n/staffPermissions.js';

// Cover fixed staff form labels in both supported languages.
test('staff form controls are localized', () => {
    assert.equal(translateMessage('id', 'Create Internal User'), 'Tambah Pengguna Internal');
    assert.equal(translateMessage('id', 'Clear Form'), 'Kosongkan Formulir');
    assert.equal(translateMessage('id', 'Select role'), 'Pilih peran');
    assert.equal(translateMessage('en', 'Create User'), 'Create User');
});

// Translate only the known role choices, never an unknown database display name.
test('staff role option labels translate without changing role codes', () => {
    const role = { value: 'ops_manager', label: 'Operations Manager' };
    assert.equal(translateStaffRoleOption('id', role), 'Manajer Operasional');
    assert.equal(translateStaffRoleOption('en', role), 'Operations Manager');
    assert.equal(role.value, 'ops_manager');
    assert.equal(
        translateStaffRoleOption('id', { value: 'custom_role', label: 'Regional Lead' }),
        'Regional Lead'
    );
});

test('administrator-edited role labels remain verbatim', () => {
    const role = { value: 'ops_manager', label: 'Tim Operasional Khusus' };
    assert.equal(translateStaffRoleOption('id', role), role.label);
    assert.equal(translateStaffRoleOption('en', role), role.label);
});

test('every enforced staff permission has localized catalogue metadata without changing codes', () => {
    const catalogue = readFileSync(new URL('../../config/rbac.php', import.meta.url), 'utf8').split(
        "    'baseline'"
    )[0];
    const entries = [
        ...catalogue.matchAll(
            /'(staff\.[^']+)' => \['label' => '([^']+)', 'group' => '([^']+)', 'usage' => '([^']+)'\]/g
        ),
    ];
    assert.ok(entries.length > 0);
    for (const [, name, display_name, group, usage] of entries) {
        const record = { name, display_name, group, usage };
        const original = { ...record };
        assert.equal(translateStaffPermissionField('en', record), display_name);
        assert.notEqual(translateStaffPermissionField('id', record), display_name, name);
        assert.equal(
            translateStaffPermissionField('en', record, 'group'),
            group[0].toUpperCase() + group.slice(1)
        );
        assert.notEqual(translateStaffPermissionField('id', record, 'group'), group, name);
        const localizedUsage = translateStaffPermissionField('id', record, 'usage');
        for (const route of usage.match(/(?:admin\.|documents\.)[\w.*-]+/g) || [])
            assert.ok(localizedUsage.includes(route));
        assert.deepEqual(record, original);
    }
});

test('legacy fixed permissions translate while custom names and metadata remain verbatim', () => {
    assert.equal(
        translateStaffPermissionField('id', {
            name: 'documents.upload',
            display_name: 'Upload Documents',
        }),
        'Unggah Dokumen'
    );
    assert.equal(translateStaffPermissionGroup('id', 'documents'), 'Dokumen');
    for (const name of ['staff.documents.verify', 'documents.verify', 'custom.verify']) {
        const custom = {
            name,
            display_name: 'View Vendors',
            group: 'Tim Khusus',
            usage: 'Catatan admin',
        };
        assert.equal(translateStaffPermissionField('id', custom), 'View Vendors');
        assert.equal(translateStaffPermissionField('id', custom, 'group'), custom.group);
        assert.equal(translateStaffPermissionField('id', custom, 'usage'), custom.usage);
    }
});

test('staff empty states, deletion and permission usage prose are localized', () => {
    for (const source of ['Confirm Deletion', 'No staff roles found', 'No permissions found']) {
        assert.notEqual(translateMessage('id', source), source);
        assert.equal(translateMessage('en', source), source);
    }
    assert.equal(
        translateStaffPermissionField(
            'id',
            {
                name: 'staff.dashboard.summary',
                usage: 'admin.dashboard cross-module statistics and activity',
            },
            'usage'
        ),
        'admin.dashboard — statistik dan aktivitas lintas modul'
    );
});
