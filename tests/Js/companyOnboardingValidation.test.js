import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const source = readFileSync(
    new URL('../../resources/js/Pages/Vendor/Onboarding/Steps/StepCompany.jsx', import.meta.url),
    'utf8'
);

// Guard visible client and server errors for every required company field.
test('all required company fields render their validation errors', () => {
    const requiredFields = [
        'company_name',
        'business_type',
        'category_id',
        'experience',
        'business_identification_number',
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
        assert.match(source, new RegExp(`clientErrors\\.${field}\\s*\\|\\|\\s*errors\\.${field}`));
    }
});

test('company category, experience, and registration guidance are bilingual', () => {
    const examples = [
        ['Category', 'Kategori'],
        ['Experience', 'Pengalaman'],
        ['Registration Instructions', 'Petunjuk Pengisian'],
        [
            'e.g., Software procurement for PPM Manajemen in 2025.',
            'contoh: Pengadaan software untuk PPM Manajemen pada 2025.',
        ],
    ];

    for (const [message, translated] of examples) {
        assert.equal(translateMessage('id', message), translated);
        assert.equal(translateMessage('en', message), message);
    }
});

test('company fields use bilingual example placeholders', () => {
    const placeholders = [
        ['e.g., PPM Manajemen', 'contoh: PPM Manajemen'],
        ['e.g., 1234567890123', 'contoh: 1234567890123'],
        ['e.g., 0123456789012345', 'contoh: 0123456789012345'],
        ['e.g., John Doe', 'contoh: John Doe'],
        ['e.g., 081234567890', 'contoh: 081234567890'],
        ['e.g., 10340', 'contoh: 10340'],
    ];

    for (const [placeholder, translated] of placeholders) {
        assert.match(source, new RegExp(placeholder.replace(/[().]/g, '\\$&')));
        assert.equal(translateMessage('id', placeholder), translated);
    }

    for (const selectPlaceholder of ['Select Type', 'Select Category', 'Select Province']) {
        assert.match(source, new RegExp(`placeholder=\\{t\\('${selectPlaceholder}'\\)\\}`));
    }
});

// Verify newly completed company validation messages are bilingual.
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

// Keep complete identifier labels visible and bilingual on company onboarding.
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
