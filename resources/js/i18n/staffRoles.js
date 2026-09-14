import { translateMessage } from './translations.js';

// Start Update 13 September 2026, by @WNP: Translate only the three fixed staff-role choices, never database role display names.
const STAFF_ROLE_OPTION_LABELS = Object.freeze({
    super_admin: 'Super Admin',
    ops_manager: 'Operations Manager',
    finance_manager: 'Finance Manager',
});

// Start Update 13 September 2026, by @WNP: Preserve unknown role labels and all submitted role codes.
export function translateStaffRoleOption(language, role) {
    const label = STAFF_ROLE_OPTION_LABELS[role?.value];
    return label ? translateMessage(language, label) : role?.label;
}
