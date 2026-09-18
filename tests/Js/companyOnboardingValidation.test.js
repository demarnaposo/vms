import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const source = readFileSync(
    new URL('../../resources/js/Pages/Vendor/Onboarding/Steps/StepCompany.jsx', import.meta.url),
    'utf8'
);

// Start Update 16 September 2026, by @WNP: Guard visible client and server errors for every required company field.
test('all required company fields render their validation errors', () => {
    const requiredFields = [
        'company_name',
        'business_type',
        'registration_number',
        'tax_id',
        'deed_number',
        'contact_person',
        'contact_phone',
        'address',
        'state',
        'city',
        'pincode',
    ];

    for (const field of requiredFields) {
        assert.match(source, new RegExp(`clientErrors\\.${field} \\|\\| errors\\.${field}`));
    }
});

// Start Update 16 September 2026, by @WNP: Verify newly completed company validation messages are bilingual.
test('company and address validation messages follow the selected language', () => {
    const examples = [
        ['Company Name is required.', 'Nama perusahaan wajib diisi.'],
        [
            'Company Name may not exceed 255 characters.',
            'Nama perusahaan tidak boleh lebih dari 255 karakter.',
        ],
        ['Address is required.', 'Alamat wajib diisi.'],
        ['Address may not exceed 500 characters.', 'Alamat tidak boleh lebih dari 500 karakter.'],
    ];

    for (const [message, translated] of examples) {
        assert.equal(translateMessage('id', message), translated);
        assert.equal(translateMessage('en', message), message);
    }
});

// Start Update 16 September 2026, by @WNP: Keep complete identifier labels visible and bilingual on company onboarding.
test('business and taxpayer identifiers use their complete labels', () => {
    const labels = [
        ['Business Identification Number (NIB)', 'Nomor Induk Berusaha (NIB)'],
        ['Taxpayer Identification Number (NPWP)', 'Nomor Pokok Wajib Pajak (NPWP)'],
    ];

    for (const [label, translated] of labels) {
        assert.match(source, new RegExp(`t\\('${label.replace(/[()]/g, '\\$&')}'\\)`));
        assert.equal(translateMessage('id', label), translated);
        assert.equal(translateMessage('en', label), label);
    }
});
