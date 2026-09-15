import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify all fixed profile settings labels and feedback are bilingual.
test('profile settings static copy is localized', () => {
    const examples = [
        ['Profile Settings', 'Pengaturan Profil'],
        ['Manage your account settings', 'Kelola pengaturan akun Anda'],
        ['Profile Information', 'Informasi Profil'],
        ['Current Password', 'Kata Sandi Saat Ini'],
        ['New Password', 'Kata Sandi Baru'],
        ['Confirm New Password', 'Konfirmasi Kata Sandi Baru'],
        ['Update Password', 'Perbarui Kata Sandi'],
        ['Updating...', 'Memperbarui...'],
        ['Danger Zone', 'Zona Berbahaya'],
        ['Delete Account', 'Hapus Akun'],
        ['Delete My Account', 'Hapus Akun Saya'],
        ['Deleting...', 'Menghapus...'],
        ['Enter your password to confirm', 'Masukkan kata sandi Anda untuk konfirmasi'],
        ['Profile updated successfully.', 'Profil berhasil diperbarui.'],
        ['Password updated successfully.', 'Kata sandi berhasil diperbarui.'],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Start Update 15 September 2026, by @WNP: Guard profile tab localization while leaving account data untouched.
test('profile tabs use the shared translator', () => {
    const source = readFileSync(
        new URL('../../resources/js/Pages/Profile/Edit.jsx', import.meta.url),
        'utf8'
    );

    assert.match(source, /const \{ t \} = useLanguage\(\)/);
    assert.match(source, /\{t\(section\.label\)\}/);
    assert.match(source, /name: user\?\.name \|\| ''/);
    assert.match(source, /email: user\?\.email \|\| ''/);
});
