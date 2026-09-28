// Share Indonesian mobile input limits and validation across VMS forms.
export const INDONESIAN_MOBILE_INPUT_MAX_LENGTH = 13;
export const INDONESIAN_MOBILE_ERROR =
    'WhatsApp Number must start with 08 and contain digits only.';

const MOBILE_NUMBER_REGEX = /^08[1-9][0-9]{7,10}$/;

export function sanitizeIndonesianMobileInput(value) {
    return value.slice(0, INDONESIAN_MOBILE_INPUT_MAX_LENGTH);
}

export function validateIndonesianMobileNumber(value) {
    if (!value || value.trim() === '') return 'WhatsApp Number is required.';
    return MOBILE_NUMBER_REGEX.test(value) ? '' : INDONESIAN_MOBILE_ERROR;
}
