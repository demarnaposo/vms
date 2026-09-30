import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';
import { resolveFlashToast } from '../../resources/js/utils/flashToast.js';

const source = readFileSync(
    new URL('../../resources/js/Pages/Auth/VerifyEmail.jsx', import.meta.url),
    'utf8'
);

test('verification page localizes static copy and keeps the email address unchanged', () => {
    assert.equal(translateMessage('id', 'Verify Email Address'), 'Verifikasi Alamat Email');
    assert.equal(
        translateMessage(
            'id',
            'A verification link has been sent to :email. Follow it to continue.',
            {
                email: 'vendor@example.com',
            }
        ),
        'Tautan verifikasi telah dikirim ke vendor@example.com. Buka tautan tersebut untuk melanjutkan.'
    );
    assert.match(source, /resendForm\.post\('\/email\/verification-notification'\)/);
    assert.deepEqual(
        resolveFlashToast({ status: 'verification-link-sent' }, (message) =>
            translateMessage('id', message)
        ),
        {
            type: 'success',
            title: 'Tautan verifikasi baru telah dikirim ke alamat email Anda.',
        }
    );
});
