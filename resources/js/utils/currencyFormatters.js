// Start Update 11 September 2026, by @WNP: Centralize the default IDR settings used by all React currency displays.
export const DEFAULT_CURRENCY = Object.freeze({
    code: 'IDR',
    symbol: 'Rp',
    locale: 'id-ID',
    fraction_digits: 0,
});

// Start Update 11 September 2026, by @WNP: Format nominal values with Indonesian grouping and a consistent Rupiah symbol.
export function formatCurrency(value, currency = DEFAULT_CURRENCY) {
    const settings = { ...DEFAULT_CURRENCY, ...currency };
    const numericValue = Number.parseFloat(value);
    const safeValue = Number.isNaN(numericValue) ? 0 : numericValue;
    const fractionDigits = Number(settings.fraction_digits) || 0;
    const formattedValue = new Intl.NumberFormat(settings.locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(safeValue);

    return `${settings.symbol} ${formattedValue}`;
}
