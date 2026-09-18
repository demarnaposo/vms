import { translateMessage } from './translations.js';

// Start Update 15 September 2026, by @WNP: Define translatable VMS master records by stable category and name.
export const SYSTEM_MASTER_DATA = Object.freeze({
    roles: {
        super_admin: {
            display_name: 'Super Admin',
            description: 'Full system access',
        },
        ops_manager: {
            display_name: 'Operations Manager',
            description: 'Vendor onboarding and document verification',
        },
        finance_manager: {
            display_name: 'Finance Manager',
            description: 'Payment approvals and financial history',
        },
        vendor: {
            display_name: 'Vendor',
            description: 'External vendor with limited access',
        },
    },
    permissions: {
        'vendors.view': { display_name: 'View Vendors' },
        'vendors.create': { display_name: 'Create Vendors' },
        'vendors.update': { display_name: 'Update Vendors' },
        'vendors.delete': { display_name: 'Delete Vendors' },
        'vendors.approve': { display_name: 'Approve Vendors' },
        'vendors.suspend': { display_name: 'Suspend Vendors' },
        'documents.view': { display_name: 'View Documents' },
        'documents.upload': { display_name: 'Upload Documents' },
        'documents.verify': { display_name: 'Verify Documents' },
        'documents.reject': { display_name: 'Reject Documents' },
        'payments.view': { display_name: 'View Payments' },
        'payments.request': { display_name: 'Request Payment' },
        'payments.approve': { display_name: 'Approve Payments' },
        'payments.reject': { display_name: 'Reject Payments' },
        'compliance.view': { display_name: 'View Compliance' },
        'compliance.manage': { display_name: 'Manage Compliance Rules' },
        'reports.view': { display_name: 'View Reports' },
        'reports.export': { display_name: 'Export Reports' },
        'users.manage': { display_name: 'Manage Users' },
        'roles.manage': { display_name: 'Manage Roles' },
        'audit.view': { display_name: 'View Audit Logs' },
    },
    vendor_states: {
        draft: { display_name: 'Draft' },
        submitted: { display_name: 'Submitted' },
        under_review: { display_name: 'Under Review' },
        approved: { display_name: 'Approved' },
        active: { display_name: 'Active' },
        suspended: { display_name: 'Suspended' },
        terminated: { display_name: 'Terminated' },
        rejected: { display_name: 'Rejected' },
    },
    document_types: {
        company_registration: {
            display_name: 'Company Registration Certificate',
            description: 'Certificate of incorporation or business registration',
        },
        gst_certificate: {
            // Start Update 16 September 2026, by @WNP: Localize the stable master key with the complete taxpayer identifier label.
            display_name: 'Taxpayer Identification Number (NPWP) Document',
            description: 'Taxpayer identification document',
        },
        pan_card: {
            // Start Update 16 September 2026, by @WNP: Localize the stable master key with the complete business identifier label.
            display_name: 'Business Identification Number (NIB) Document',
            description: 'Business identification document',
        },
        cancelled_cheque: {
            // Start Update 16 September 2026, by @WNP: Present bank-account proof instead of a cheque-specific document.
            display_name: 'Bank Account Proof',
            description: 'Bank account ownership proof for payment verification',
        },
        insurance: {
            display_name: 'Insurance Certificate',
            description: 'Business liability insurance certificate',
        },
        nda: {
            display_name: 'Non-Disclosure Agreement',
            description: 'Signed NDA/Confidentiality agreement',
        },
        service_agreement: {
            display_name: 'Service Agreement',
            description: 'Master service agreement or contract',
        },
    },
    compliance_rules: {
        mandatory_documents: {
            display_name: 'Mandatory Documents',
            description: 'All mandatory documents must be uploaded and verified',
        },
        document_expiry_check: {
            display_name: 'Document Expiry Check',
            description: 'Documents should not be expired or expiring within 15 days',
        },
        minimum_performance: {
            display_name: 'Minimum Performance',
            description: 'Vendor performance score must be at least 40',
        },
    },
    performance_metrics: {
        delivery_timeliness: {
            display_name: 'Delivery Timeliness',
            description: 'How consistently the vendor meets delivery deadlines',
        },
        issue_frequency: {
            display_name: 'Issue Frequency',
            description: 'Frequency of issues or defects reported (lower is better)',
        },
        ops_rating: {
            display_name: 'Operations Rating',
            description: 'Manual rating provided by operations team',
        },
        contract_adherence: {
            display_name: 'Contract Adherence',
            description: 'How well the vendor adheres to contract terms',
        },
    },
});

// Start Update 15 September 2026, by @WNP: Translate only recognized master fields and preserve custom database records verbatim.
export function translateSystemMasterDataField(
    language,
    category,
    record,
    field = 'display_name',
    fallback = ''
) {
    if (!record || typeof record !== 'object') return fallback;

    const categoryDefinitions = SYSTEM_MASTER_DATA[category];
    const definition =
        categoryDefinitions && Object.hasOwn(categoryDefinitions, record.name)
            ? categoryDefinitions[record.name]
            : null;
    const source = definition?.[field] || record[field] || fallback;

    return definition && source ? translateMessage(language, source) : source;
}
