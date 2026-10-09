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

for (const language of ['id', 'en']) {
    const t = (message, replacements) => translateMessage(language, message, replacements);
    for (const [message, expected] of [
        [
            ':document verified successfully.',
            language === 'id'
                ? 'Profil Perusahaan berhasil diverifikasi.'
                : 'Company Profile verified successfully.',
        ],
        [
            ':document rejected.',
            language === 'id' ? 'Profil Perusahaan ditolak.' : 'Company Profile rejected.',
        ],
    ]) {
        test(`${language}: document outcome follows UI language independently of server locale`, () => {
            for (const serverText of [
                'Company Profile verified successfully.',
                'Profil Perusahaan berhasil diverifikasi.',
            ]) {
                assert.deepEqual(
                    resolveFlashToast(
                        {
                            success: serverText,
                            success_i18n: {
                                message,
                                document_type: {
                                    name: 'company_profile',
                                    display_name: 'Company Profile',
                                },
                            },
                        },
                        t,
                        language
                    ),
                    { type: 'success', title: expected }
                );
            }
        });
    }
    test(`${language}: custom document labels remain verbatim inside localized outcome`, () => {
        for (const documentType of [
            { name: 'custom', display_name: 'Company Profile' },
            { name: 'company_profile', display_name: 'My Custom Profile' },
        ]) {
            const title = resolveFlashToast(
                {
                    success: 'server fallback',
                    success_i18n: {
                        message: ':document verified successfully.',
                        document_type: documentType,
                    },
                },
                t,
                language
            ).title;
            assert.equal(
                title,
                `${documentType.display_name} ${language === 'id' ? 'berhasil diverifikasi.' : 'verified successfully.'}`
            );
        }
    });
}

test('invalid translation metadata keeps the original flash contract', () => {
    assert.equal(
        resolveFlashToast(
            { success: 'Custom text', success_i18n: { message: 'unknown' } },
            translate
        ).title,
        'Custom text'
    );
    assert.equal(
        resolveFlashToast({ success_i18n: { message: ':document rejected.' } }, translate),
        null
    );
});
