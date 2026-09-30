import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFlashToast } from '../../resources/js/utils/flashToast.js';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const translate = (message) => translateMessage('id', message);

test('flash messages keep their types and translate known application copy', () => {
    assert.deepEqual(resolveFlashToast({ success: 'Profile updated successfully.' }, translate), {
        type: 'success',
        title: 'Profil berhasil diperbarui.',
    });
    assert.deepEqual(resolveFlashToast({ error: 'Vendor profile not found.' }, translate), {
        type: 'error',
        title: 'Profil vendor tidak ditemukan.',
    });
});

test('a successful action with a follow-up failure becomes one warning with description', () => {
    assert.deepEqual(
        resolveFlashToast(
            { success: 'Profile updated successfully.', error: 'Vendor profile not found.' },
            translate
        ),
        {
            type: 'warning',
            title: 'Profil berhasil diperbarui.',
            description: 'Profil vendor tidak ditemukan.',
        }
    );
});

test('unknown database text stays unchanged and empty flash creates no toast', () => {
    const customMessage = 'Catatan khusus dari vendor';
    assert.deepEqual(resolveFlashToast({ success: customMessage }, translate), {
        type: 'success',
        title: customMessage,
    });
    assert.equal(resolveFlashToast({}, translate), null);
});
