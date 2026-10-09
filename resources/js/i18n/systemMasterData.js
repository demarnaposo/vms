import { translateMessage } from './translations.js';

const DOCUMENT_TYPE_CODE_ALIASES = Object.freeze({
    gst_certificate: 'npwp',
    pan_card: 'nib_oss',
    cancelled_cheque: 'bank_account_proof',
});

// Define translatable VMS master records by stable category and name.
export const SYSTEM_MASTER_DATA = Object.freeze({
    business_types: {
        sole_proprietor: { display_name: 'Sole Proprietorship' },
        partnership: { display_name: 'Partnership' },
        llp: { display_name: 'LLP' },
        pvt_ltd: { display_name: 'Private Limited' },
        public_ltd: { display_name: 'Public Limited' },
    },
    vendor_categories: {
        general_services_facility: {
            display_name: 'General Services & Facility',
            description: 'Cleaning Services, Security Services, Pest Control, Landscaping',
        },
        mep_maintenance: {
            display_name: 'MEP & Maintenance',
            description: 'Air Conditioning, Electrical, Plumbing, Elevators, Generators',
        },
        construction_maintenance: {
            display_name: 'Construction & Maintenance',
            description: 'Renovation Contractors, Interiors, Furniture, Signage',
        },
        it_digital: {
            display_name: 'IT & Digital',
            description: 'Hardware, Software/LMS, Websites, Networks, Zoom/M365 Licenses',
        },
        marketing_creative: {
            display_name: 'Marketing & Creative',
            description: 'Event Organizers, Printing, Merchandise, Agencies, Photographers, MCs',
        },
        food_beverages: {
            display_name: 'Food & Beverages',
            description: 'Catering, Coffee Breaks, Snack Boxes, Partner Restaurants',
        },
        education_professional_service: {
            display_name: 'Education & Professional Service',
            description: 'Speakers, Facilitators, Certification Bodies, Translators, Consultants',
        },
        logistic_transport: {
            display_name: 'Logistic & Transport',
            description: 'Travel Agents, Vehicle Rentals, Freight Forwarding, Couriers',
        },
        operational_supply: {
            display_name: 'Operational Supply',
            description: 'Stationery, Uniforms, Consumables, Drinking Water, Tissues',
        },
        finance_legal: {
            display_name: 'Finance & Legal',
            description: 'Auditors, Notaries, Insurance, Banks, Tax',
        },
    },
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
        company_profile: {
            display_name: 'Company Profile',
            description: 'Company overview and capabilities',
        },
        other_supporting_documents: {
            display_name: 'Other Supporting Documents',
            description: 'Additional supporting documents supplied by the vendor',
        },
        company_deed: {
            display_name: 'Company Deed of Establishment',
            description: 'Deed establishing the company',
        },
        bank_account_letter: {
            display_name: 'Bank Account Confirmation Letter',
            description: 'Bank letter confirming the company account',
        },
        domicile_letter: {
            display_name: 'Company Domicile Certificate',
            description: 'Letter confirming the company domicile',
        },
        pic_identity_card: {
            display_name: 'Company Owner/Officer Identity Card (KTP)',
            description: 'Identity card of the person in charge',
        },
        experience_portfolio: {
            display_name: 'Experience Portfolio',
            description: 'Portfolio of previous projects and work experience',
        },
        business_license: {
            display_name: 'SIUP / Business License',
            description: 'Trading license or other applicable business license',
        },
        pkp_certificate: {
            display_name: 'Taxable Entrepreneur Confirmation (SPPKP)',
            description: 'Optional certificate for vendors registered as PKP',
        },
        company_registration: {
            display_name: 'Company Registration Certificate',
            description: 'Certificate of incorporation or business registration',
        },
        npwp: {
            // Localize the stable master key with the complete taxpayer identifier label.
            display_name: 'NPWP (Taxpayer Identification Number)',
            description: 'Taxpayer identification document',
        },
        nib_oss: {
            // Localize the stable master key with the complete business identifier label.
            display_name: 'NIB/OSS (Business Identification Number)',
            description: 'Business identification document',
        },
        bank_account_proof: {
            // Present bank-account proof instead of a cheque-specific document.
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
        work_quality: {
            display_name: 'Work Quality',
            description: 'Quality of the goods/services provided meets specifications',
        },
        work_quantity: {
            display_name: 'Work Quantity',
            description: 'Quantity of goods/services matches the order',
        },
        goods_services_price: {
            display_name: 'Price of Goods/Services',
            description: 'Assessment of how competitive the vendor\u2019s price quotation is',
        },
        goods_services_provision: {
            display_name: 'Provision of Goods/Services',
            description:
                'Timeliness of goods/services delivery, including replacement goods/services or complaint handling',
        },
        payment_mechanism: {
            display_name: 'Mechanism',
            description: 'Payment flexibility (payment on credit terms is possible)',
        },
        invoice_delivery: {
            display_name: 'Invoice Delivery',
            description: 'Timely delivery of complete and correct invoices',
        },

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

// Translate only recognized master fields and preserve custom database records verbatim.
export function translateSystemMasterDataField(
    language,
    category,
    record,
    field = 'display_name',
    fallback = ''
) {
    if (!record || typeof record !== 'object') return fallback;

    const categoryDefinitions = SYSTEM_MASTER_DATA[category];
    if (category === 'vendor_categories' && record[field] == null) return fallback;
    const name =
        category === 'vendor_categories'
            ? record.code
            : category === 'document_types' &&
                Object.hasOwn(DOCUMENT_TYPE_CODE_ALIASES, record.name)
              ? DOCUMENT_TYPE_CODE_ALIASES[record.name]
              : record.name;
    const definition =
        categoryDefinitions && Object.hasOwn(categoryDefinitions, name)
            ? categoryDefinitions[name]
            : null;
    if (
        [
            'document_types',
            'roles',
            'performance_metrics',
            'business_types',
            'vendor_categories',
        ].includes(category) &&
        record[field] != null &&
        record[field] !== definition?.[field]
    )
        return record[field];
    const source = definition?.[field] || record[field] || fallback;

    return definition && source ? translateMessage(language, source) : source;
}
