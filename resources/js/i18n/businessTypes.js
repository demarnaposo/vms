import { translateMessage } from './translations.js';

// Start Update 16 September 2026, by @WNP: Map fixed VMS business-type codes to display labels without changing stored values.
const BUSINESS_TYPE_LABELS = Object.freeze({
    sole_proprietor: 'Sole Proprietorship',
    proprietorship: 'Sole Proprietorship',
    partnership: 'Partnership',
    llp: 'LLP',
    pvt_ltd: 'Private Limited',
    private_limited: 'Private Limited',
    public_ltd: 'Public Limited',
    public_limited: 'Public Limited',
});

// Start Update 16 September 2026, by @WNP: Translate only recognized static business types and preserve manual values verbatim.
export function translateBusinessType(language, value, fallback = '-') {
    if (!value) return fallback;

    const label = Object.hasOwn(BUSINESS_TYPE_LABELS, value) ? BUSINESS_TYPE_LABELS[value] : null;

    return label ? translateMessage(language, label) : value;
}
