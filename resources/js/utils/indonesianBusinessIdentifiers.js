// Start Update 16 September 2026, by @WNP: Keep NIB and NPWP inputs in their canonical digits-only format.
export function sanitizeBusinessIdentifier(value, maxLength) {
    return String(value ?? '')
        .replace(/\D/g, '')
        .slice(0, maxLength);
}

// Start Update 16 September 2026, by @WNP: Validate Indonesia's 13-digit business identification number.
export function validateNib(value) {
    if (!value) return 'Business Identification Number (NIB) is required.';
    if (!/^[0-9]{13}$/.test(value)) {
        return 'Business Identification Number (NIB) must be exactly 13 digits.';
    }

    return '';
}

// Start Update 16 September 2026, by @WNP: Accept current 16-digit and legacy 15-digit NPWP values.
export function validateNpwp(value) {
    if (!value) return 'Taxpayer Identification Number (NPWP) is required.';
    if (!/^[0-9]{15,16}$/.test(value)) {
        return 'Taxpayer Identification Number (NPWP) must be 15 or 16 digits.';
    }

    return '';
}
