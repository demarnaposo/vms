import test from 'node:test';
import assert from 'node:assert/strict';
import {
    INDONESIAN_MOBILE_INPUT_MAX_LENGTH,
    sanitizeIndonesianMobileInput,
    validateIndonesianMobileNumber,
} from '../../resources/js/utils/indonesianMobilePhone.js';
// Start Update 14 September 2026, by @WNP: Verify VMS phone guidance follows the selected language.
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 14 September 2026, by @WNP: Verify VMS accepts local and international Indonesian mobile input.
test('Indonesian mobile input accepts 08 and +628 formats', () => {
    assert.equal(validateIndonesianMobileNumber('081234567890'), '');
    assert.equal(validateIndonesianMobileNumber('+6281234567890'), '');
    assert.equal(validateIndonesianMobileNumber('0812345678'), '');
    assert.equal(validateIndonesianMobileNumber('0812345678901'), '');
});

// Start Update 14 September 2026, by @WNP: Reject unsupported prefixes and numbers outside VMS mobile length limits.
test('Indonesian mobile input rejects invalid lengths and prefixes', () => {
    for (const number of ['9876543210', '081234567', '08123456789012', '+62081234567890']) {
        assert.notEqual(validateIndonesianMobileNumber(number), '');
    }
});

// Start Update 14 September 2026, by @WNP: Keep formatted pasted numbers within the supported input length.
test('Indonesian mobile input sanitizes pasted characters and caps length', () => {
    assert.equal(sanitizeIndonesianMobileInput('+62 812-3456-7890'), '+6281234567890');
    assert.equal(sanitizeIndonesianMobileInput('0812 3456 7890'), '081234567890');
    assert.equal(INDONESIAN_MOBILE_INPUT_MAX_LENGTH, 15);
    assert.equal(sanitizeIndonesianMobileInput('+628123456789012345'), '+62812345678901');
});

// Start Update 14 September 2026, by @WNP: Keep the VMS phone label, validation, and help text localized.
test('phone label, guidance, and validation have translations', () => {
    assert.equal(translateMessage('id', 'Phone Number / Mobile'), 'Nomor Telepon / Ponsel');
    assert.equal(
        translateMessage('id', validateIndonesianMobileNumber('9876543210')),
        'Masukkan nomor ponsel yang valid (contoh: 081234567890 atau +6281234567890).'
    );
    assert.equal(
        translateMessage('id', 'Use 08... or +628... for a mobile number.'),
        'Gunakan 08... atau +628... untuk nomor ponsel.'
    );
});
