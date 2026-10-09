import { translateSystemMasterDataField } from './systemMasterData.js';

export function vendorCategoryLabel(language, category, field = 'display_name') {
    return translateSystemMasterDataField(language, 'vendor_categories', category, field);
}
