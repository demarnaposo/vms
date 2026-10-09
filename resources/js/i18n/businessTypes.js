import { translateSystemMasterDataField } from './systemMasterData.js';

export function businessTypeLabel(language, record) {
    return translateSystemMasterDataField(language, 'business_types', {
        ...record,
        name: record.code,
    });
}

export function businessTypeOptions(language, records) {
    return records.map((record) => ({
        value: record.code,
        label: businessTypeLabel(language, record),
    }));
}

export function translateBusinessType(language, value, records = [], fallback = '-') {
    if (!value) return fallback;
    const record = records.find((record) => record.code === value);
    return record ? businessTypeLabel(language, record) : value;
}
