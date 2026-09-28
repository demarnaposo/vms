import test from 'node:test';
import assert from 'node:assert/strict';
import {
    INDONESIAN_MOBILE_INPUT_MAX_LENGTH,
    sanitizeIndonesianMobileInput,
    validateIndonesianMobileNumber,
} from '../../resources/js/utils/indonesianMobilePhone.js';
// Verify VMS phone guidance follows the selected language.
import { translateMessage } from '../../resources/js/i18n/translations.js';

test('WhatsApp input accepts only local 08 mobile numbers', () => {
    assert.equal(validateIndonesianMobileNumber('081234567890'), '');
    assert.equal(validateIndonesianMobileNumber('0812345678'), '');
    assert.equal(validateIndonesianMobileNumber('0812345678901'), '');
});

// Reject unsupported prefixes and numbers outside VMS mobile length limits.
test('Indonesian mobile input rejects invalid lengths and prefixes', () => {
    for (const number of [
        '9876543210',
        '081234567',
        '08123456789012',
        '+6281234567890',
        '0812 3456 7890',
        '0812-3456-7890',
        '0812abc56789',
    ]) {
        assert.notEqual(validateIndonesianMobileNumber(number), '');
    }
});

// Keep formatted pasted numbers within the supported input length.
test('WhatsApp input preserves invalid characters for validation and caps length', () => {
    assert.equal(sanitizeIndonesianMobileInput('0812-3456-7890'), '0812-3456-789');
    assert.equal(INDONESIAN_MOBILE_INPUT_MAX_LENGTH, 13);
    assert.equal(sanitizeIndonesianMobileInput('08123456789012345'), '0812345678901');
});

// Keep the VMS phone label, validation, and help text localized.
test('phone label, guidance, and validation have translations', () => {
    assert.equal(translateMessage('id', 'WhatsApp Number'), 'Nomor WhatsApp');
    assert.equal(
        translateMessage('id', validateIndonesianMobileNumber('9876543210')),
        'Nomor WhatsApp harus diawali 08 dan hanya berisi angka.'
    );
    assert.equal(
        translateMessage('id', 'Use the 08xxxxxxxxxx format and digits only.'),
        'Gunakan format 08xxxxxxxxxx dan hanya masukkan angka.'
    );
});
