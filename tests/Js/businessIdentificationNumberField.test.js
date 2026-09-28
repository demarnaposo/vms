import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('NIB labels and validation messages are bilingual while manual values remain unchanged', () => {
    const messages = [
        ['Business Identification Number (NIB)', 'Nomor Induk Berusaha (NIB)'],
        [
            'Business Identification Number (NIB) is required.',
            'Nomor Induk Berusaha (NIB) wajib diisi.',
        ],
        [
            'Business Identification Number (NIB) must be exactly 13 digits.',
            'Nomor Induk Berusaha (NIB) harus tepat 13 digit.',
        ],
        ['e.g., 1234567890123', 'contoh: 1234567890123'],
    ];

    for (const [english, indonesian] of messages) {
        assert.equal(translateMessage('en', english), english);
        assert.equal(translateMessage('id', english), indonesian);
    }

    assert.equal(translateMessage('id', '1234567890123'), '1234567890123');
});

test('active vendor pages use the business identification number field', () => {
    const pages = [
        '../../resources/js/Pages/Vendor/Onboarding/Steps/StepCompany.jsx',
        '../../resources/js/Pages/Vendor/Onboarding/Steps/StepReview.jsx',
        '../../resources/js/Pages/Vendor/Profile.jsx',
        '../../resources/js/Pages/Admin/Vendors/Show.jsx',
    ];

    for (const page of pages) {
        const source = readSource(page);
        assert.match(source, /business_identification_number/);
        assert.doesNotMatch(source, /registration_number/);
    }
});
