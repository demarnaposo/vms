import test from 'node:test';
import assert from 'node:assert/strict';
// Start Update 16 September 2026, by @WNP: Cover shared NIB and NPWP sanitization and validation rules.
import {
    sanitizeBusinessIdentifier,
    validateNib,
    validateNpwp,
} from '../../resources/js/utils/indonesianBusinessIdentifiers.js';

test('business identifiers are normalized to digits and capped safely', () => {
    assert.equal(sanitizeBusinessIdentifier('1234-5678-90123', 13), '1234567890123');
    assert.equal(sanitizeBusinessIdentifier('01.234.567.8-901.2345', 16), '0123456789012345');
});

test('NIB requires exactly 13 digits', () => {
    assert.equal(validateNib('1234567890123'), '');
    assert.equal(
        validateNib('123456789012'),
        'Business Identification Number (NIB) must be exactly 13 digits.'
    );
    assert.equal(validateNib(''), 'Business Identification Number (NIB) is required.');
});

test('NPWP accepts 15 or 16 digits', () => {
    assert.equal(validateNpwp('012345678901234'), '');
    assert.equal(validateNpwp('0123456789012345'), '');
    assert.equal(
        validateNpwp('01234567890123'),
        'Taxpayer Identification Number (NPWP) must be 15 or 16 digits.'
    );
    assert.equal(validateNpwp(''), 'Taxpayer Identification Number (NPWP) is required.');
});
