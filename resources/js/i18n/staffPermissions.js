import { SYSTEM_MASTER_DATA } from './systemMasterData.js';
import { translateMessage } from './translations.js';

// Match fixed catalogue metadata by code; administrator-entered values stay verbatim.
const STAFF_PERMISSIONS = {
    'staff.dashboard.summary': {
        display_name: 'View Cross-module Dashboard Summary',
        group: 'system',
        usage: 'admin.dashboard cross-module statistics and activity',
    },
    'staff.dashboard.view': {
        display_name: 'View Dashboard',
        group: 'system',
        usage: 'admin.dashboard',
    },
    'staff.vendors.view': {
        display_name: 'View Vendors',
        group: 'vendors',
        usage: 'admin.vendors.index / show',
    },
    'staff.vendors.approve': {
        display_name: 'Approve Vendors',
        group: 'vendors',
        usage: 'admin.vendors.approve',
    },
    'staff.vendors.reject': {
        display_name: 'Reject Vendors',
        group: 'vendors',
        usage: 'admin.vendors.reject',
    },
    'staff.vendors.activate': {
        display_name: 'Activate Vendors',
        group: 'vendors',
        usage: 'admin.vendors.activate',
    },
    'staff.vendors.suspend': {
        display_name: 'Suspend Vendors',
        group: 'vendors',
        usage: 'admin.vendors.suspend',
    },
    'staff.vendors.terminate': {
        display_name: 'Terminate Vendors',
        group: 'vendors',
        usage: 'admin.vendors.terminate / reactivate',
    },
    'staff.vendors.notes': {
        display_name: 'Edit Vendor Notes',
        group: 'vendors',
        usage: 'admin.vendors.notes / protected summary',
    },
    'staff.documents.list': {
        display_name: 'List Admin Documents',
        group: 'documents',
        usage: 'admin.documents.index / preview',
    },
    'staff.documents.view': {
        display_name: 'View Private Documents',
        group: 'documents',
        usage: 'documents.view / download',
    },
    'staff.documents.verify': {
        display_name: 'Verify Documents',
        group: 'documents',
        usage: 'admin.documents.verify',
    },
    'staff.documents.reject': {
        display_name: 'Reject Documents',
        group: 'documents',
        usage: 'admin.documents.reject',
    },
    'staff.compliance.access': {
        display_name: 'View Admin Compliance',
        group: 'compliance',
        usage: 'admin.compliance.dashboard / vendor / rules',
    },
    'staff.compliance.evaluate': {
        display_name: 'Evaluate Compliance',
        group: 'compliance',
        usage: 'admin.compliance.evaluate / evaluate-all',
    },
    'staff.performance.view': {
        display_name: 'View Performance',
        group: 'performance',
        usage: 'admin.performance.index / show',
    },
    'staff.performance.rate': {
        display_name: 'Rate Performance',
        group: 'performance',
        usage: 'admin.performance.rate-form / rate',
    },
    'staff.payments.view': {
        display_name: 'View Payments',
        group: 'payments',
        usage: 'admin.payments.index / show',
    },
    'staff.payments.validate': {
        display_name: 'Validate Payments',
        group: 'payments',
        usage: 'admin.payments.validate-ops (approve/reject)',
    },
    'staff.payments.approve': {
        display_name: 'Approve Payments',
        group: 'payments',
        usage: 'admin.payments.approve-finance (approve/reject)',
    },
    'staff.payments.disburse': {
        display_name: 'Mark Payments Paid',
        group: 'payments',
        usage: 'admin.payments.mark-paid',
    },
    'staff.reports.view': {
        display_name: 'View Reports',
        group: 'reports',
        usage: 'admin.reports.* read routes',
    },
    'staff.reports.export': {
        display_name: 'Export Reports',
        group: 'reports',
        usage: 'admin.reports.export',
    },
    'staff.system.health': {
        display_name: 'View System Health',
        group: 'system',
        usage: 'admin.system-health.index',
    },
    'staff.messages.manage': {
        display_name: 'Manage Messages',
        group: 'system',
        usage: 'admin.contact-messages.*',
    },
    'staff.notifications.send': {
        display_name: 'Send Notifications',
        group: 'system',
        usage: 'admin.notifications.send / store',
    },
};

const GROUP_LABELS = {
    vendors: 'Vendors',
    documents: 'Documents',
    compliance: 'Compliance',
    performance: 'Performance',
    payments: 'Payments',
    reports: 'Reports',
    system: 'System',
};

export function translateStaffPermissionGroup(language, group) {
    return Object.hasOwn(GROUP_LABELS, group)
        ? translateMessage(language, GROUP_LABELS[group])
        : group;
}

export function translateStaffPermissionField(language, permission, field = 'display_name') {
    const source = permission?.[field] ?? '';
    const code = permission?.name;
    const definition = Object.hasOwn(STAFF_PERMISSIONS, code)
        ? STAFF_PERMISSIONS[code]
        : Object.hasOwn(SYSTEM_MASTER_DATA.permissions, code)
          ? SYSTEM_MASTER_DATA.permissions[code]
          : null;
    if (!definition) return source;
    const expected =
        field === 'group' && !definition.group
            ? ['users', 'roles', 'audit'].includes(permission.name.split('.')[0])
                ? 'system'
                : permission.name.split('.')[0]
            : definition[field];
    if (source !== expected) return source;
    return field === 'group'
        ? translateStaffPermissionGroup(language, source)
        : translateMessage(language, source);
}
