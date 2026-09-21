// Resolve staff roles through the centralized VMS master-data translator.
import { translateSystemMasterDataField } from './systemMasterData.js';

// Preserve unknown role labels and all submitted role codes.
export function translateStaffRoleOption(language, role) {
    return translateSystemMasterDataField(
        language,
        'roles',
        { name: role?.value, display_name: role?.label },
        'display_name',
        role?.label
    );
}
