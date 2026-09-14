// Start Update 14 September 2026, by @WNP: Share Indonesian mobile input limits and validation across VMS forms.
export const INDONESIAN_MOBILE_INPUT_MAX_LENGTH = 15;
export const INDONESIAN_MOBILE_ERROR =
    'Enter a valid mobile number (e.g. 081234567890 or +6281234567890).';

const MOBILE_NUMBER_REGEX = /^(?:08[1-9][0-9]{7,10}|\+628[1-9][0-9]{7,10})$/;

export function sanitizeIndonesianMobileInput(value) {
    return value
        .replace(/[^0-9+]/g, '')
        .replace(/(?!^)\+/g, '')
        .slice(0, INDONESIAN_MOBILE_INPUT_MAX_LENGTH);
}

export function validateIndonesianMobileNumber(value) {
    if (!value || value.trim() === '') return 'Phone Number / Mobile is required.';
    return MOBILE_NUMBER_REGEX.test(value) ? '' : INDONESIAN_MOBILE_ERROR;
}
