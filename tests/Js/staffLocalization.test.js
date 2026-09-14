import test from 'node:test';
import assert from 'node:assert/strict';
import { translateStaffRoleOption } from '../../resources/js/i18n/staffRoles.js';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 13 September 2026, by @WNP: Cover fixed staff form labels in both supported languages.
test('staff form controls are localized', () => {
    assert.equal(translateMessage('id', 'Create Internal User'), 'Tambah Pengguna Internal');
    assert.equal(translateMessage('id', 'Clear Form'), 'Kosongkan Formulir');
    assert.equal(translateMessage('id', 'Select role'), 'Pilih peran');
    assert.equal(translateMessage('en', 'Create User'), 'Create User');
});

// Start Update 13 September 2026, by @WNP: Translate only the known role choices, never an unknown database display name.
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
