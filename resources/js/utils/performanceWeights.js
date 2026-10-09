export function percentageUnits(value) {
    const text = String(value);
    if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) return 0;
    const [whole, fraction = ''] = text.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
