// Start Update 15 September 2026, by @WNP: Resolve staff roles through the centralized VMS master-data translator.
import { translateSystemMasterDataField } from './systemMasterData.js';

// Start Update 13 September 2026, by @WNP: Preserve unknown role labels and all submitted role codes.
export function translateStaffRoleOption(language, role) {
    return translateSystemMasterDataField(
        language,
        'roles',
        { name: role?.value, display_name: role?.label },
        'display_name',
        role?.label
    );
}
