import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 16 September 2026, by @WNP: Verify the static deed-number field and validation messages in both languages.
test('translates deed-number labels and validation without changing entered values', () => {
    assert.equal(translateMessage('id', 'Deed of Establishment Number'), 'Nomor Akta Pendirian');
    assert.equal(
        translateMessage('id', 'Deed of Establishment Number is required.'),
        'Nomor akta pendirian wajib diisi.'
    );
    assert.equal(
        translateMessage('en', 'Deed of Establishment Number'),
        'Deed of Establishment Number'
    );
    assert.equal(translateMessage('id', 'DEED-000001'), 'DEED-000001');
});
