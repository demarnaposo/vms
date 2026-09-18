import { translateMessage } from './translations.js';

// Start Update 16 September 2026, by @WNP: Map known stored payment-method values to stable display labels.
const PAYMENT_METHOD_LABELS = new Map([
    ['wire transfer', 'Wire Transfer'],
    ['bank transfer', 'Bank Transfer'],
    ['cheque', 'Cheque'],
]);

// Start Update 16 September 2026, by @WNP: Translate fixed method choices while preserving custom database values verbatim.
export function translatePaymentMethod(language, paymentMethod, fallback = '') {
    if (typeof paymentMethod !== 'string' || paymentMethod.trim() === '') return fallback;

    const originalValue = paymentMethod.trim();
    const displayLabel = PAYMENT_METHOD_LABELS.get(originalValue.toLowerCase());

    return displayLabel ? translateMessage(language, displayLabel) : originalValue;
}
