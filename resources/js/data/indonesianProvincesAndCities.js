// Start Update 11 September 2026, by @WNP: Read the shared Indonesian province and regency/city snapshot.
import indonesiaRegions from '../../data/indonesiaRegions.json';

// Start Update 11 September 2026, by @WNP: Build province select options once at module initialization.
export const INDONESIAN_PROVINCES = Object.freeze(
    Object.keys(indonesiaRegions.provinces).map((province) => ({
        value: province,
        label: province,
    }))
);

// Start Update 11 September 2026, by @WNP: Return Indonesian regency/city options for the selected province.
export function getRegenciesForProvince(province) {
    if (!province) return [];

    return (indonesiaRegions.provinces[province] || []).map((regency) => ({
        value: regency,
        label: regency,
    }));
}
