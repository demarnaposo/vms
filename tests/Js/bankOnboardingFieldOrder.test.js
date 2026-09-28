import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = readSource('../../resources/js/Pages/Vendor/Onboarding/Steps/StepBank.jsx');

test('bank onboarding follows the requested field order', () => {
    const positions = [
        source.indexOf("{t('Bank Code')}"),
        source.indexOf("{t('Bank Name')}"),
        source.indexOf("{t('Account Number')}"),
        source.indexOf("{t('Branch Name')}"),
    ];

    assert.ok(positions.every((position) => position >= 0));
    assert.deepEqual(
        positions,
        positions.toSorted((left, right) => left - right)
    );
});

test('bank name remains derived from the entered bank code', () => {
    assert.match(source, /const bank = findIndonesianBankByCode\(code\)/);
    assert.match(source, /bank_name: bank\?\.name/);
});

test('active bank views use code_bank without exposing the legacy field', () => {
    const pages = [
        '../../resources/js/Pages/Vendor/Onboarding/Steps/StepBank.jsx',
        '../../resources/js/Pages/Vendor/Onboarding/Steps/StepReview.jsx',
        '../../resources/js/Pages/Vendor/Profile.jsx',
        '../../resources/js/Pages/Admin/Vendors/Show.jsx',
        '../../resources/js/Pages/Admin/Payments/Show.jsx',
    ];

    for (const page of pages) {
        const pageSource = readSource(page);
        assert.match(pageSource, /code_bank/);
        assert.doesNotMatch(pageSource, /bank_ifsc/);
    }
});

test('bank code label and validation feedback are bilingual while values remain unchanged', () => {
    const messages = [
        ['Bank Code', 'Kode Bank'],
        ['Bank Code is required.', 'Kode bank wajib diisi.'],
        ['Bank Code must be exactly 3 digits.', 'Kode bank harus tepat 3 digit.'],
        ['e.g., 008', 'contoh: 008'],
    ];

    for (const [english, indonesian] of messages) {
        assert.equal(translateMessage('en', english), english);
        assert.equal(translateMessage('id', english), indonesian);
    }

    assert.equal(translateMessage('id', '008'), '008');
});

test('manual bank fields use consistent bilingual example placeholders', () => {
    const placeholders = [
        ['e.g., 008', 'contoh: 008'],
        ['e.g., Bank Mandiri', 'contoh: Bank Mandiri'],
        ['e.g., 1234567890', 'contoh: 1234567890'],
        ['e.g., KCP Jakarta Menteng', 'contoh: KCP Jakarta Menteng'],
    ];

    for (const [placeholder, translated] of placeholders) {
        assert.match(source, new RegExp(placeholder.replace(/[().]/g, '\\$&')));
        assert.equal(translateMessage('id', placeholder), translated);
        assert.equal(translateMessage('en', placeholder), placeholder);
    }
});
