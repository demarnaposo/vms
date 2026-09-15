import { usePage, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import {
    VendorLayout,
    PageHeader,
    Card,
    Button,
    Badge,
    AppIcon,
    FormInput,
    FormSelect,
} from '@/Components';
import { formatDate } from '@/utils/dateFormatters';
// Start Update 11 September 2026, by @WNP: Use the centralized Indonesian province and regency/city dataset.
import { INDONESIAN_PROVINCES, getRegenciesForProvince } from '@/data/indonesianProvincesAndCities';
// Start Update 11 September 2026, by @WNP: Resolve Indonesian bank names locally from three-digit transfer codes.
import { findIndonesianBankByCode } from '@/data/indonesianBanks';
// Start Update 11 September 2026, by @WNP: Translate vendor profile tabs, fields, and actions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 14 September 2026, by @WNP: Match VMS profile phone input to Indonesian onboarding rules.
import {
    sanitizeIndonesianMobileInput,
    validateIndonesianMobileNumber as validatePhoneNumber,
} from '@/utils/indonesianMobilePhone';

// Start Update 11 September 2026, by @WNP: Use Indonesia's three-digit bank transfer code format.
const BANK_CODE_REGEX = /^[0-9]{3}$/;

export default function Profile({ vendor }) {
    const { t } = useLanguage();
    const { auth } = usePage().props;
    const user = auth.user;
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('company');
    const [clientErrors, setClientErrors] = useState({});

    const form = useForm({
        company_name: vendor?.company_name || '',
        registration_number: vendor?.registration_number || '',
        tax_id: vendor?.tax_id || '',
        pan_number: vendor?.pan_number || '',
        business_type: vendor?.business_type || '',
        contact_person: vendor?.contact_person || '',
        contact_phone: vendor?.contact_phone || '',
        contact_email: vendor?.contact_email || user?.email || '',
        address: vendor?.address || '',
        city: vendor?.city || '',
        state: vendor?.state || '',
        pincode: vendor?.pincode || '',
        bank_name: vendor?.bank_name || '',
        bank_account_number: vendor?.bank_account_number || '',
        bank_ifsc: vendor?.bank_ifsc || '',
        bank_branch: vendor?.bank_branch || '',
    });

    // Start Update 11 September 2026, by @WNP: Derive regency/city options only when the selected province changes.
    const cityOptions = useMemo(() => getRegenciesForProvince(form.data.state), [form.data.state]);
    // Start Update 11 September 2026, by @WNP: Derive Indonesian bank resolution without extra state or external requests.
    const resolvedBank = findIndonesianBankByCode(form.data.bank_ifsc);

    // --- Contact Validations ---
    const validateContactPerson = (value) => {
        if (!value || value.trim() === '') return 'Contact Person is required.';
        return '';
    };

    const validateAddress = (value) => {
        if (!value || value.trim() === '') return 'Address is required.';
        return '';
    };

    const validateState = (value) => {
        if (!value || value.trim() === '') return 'Province is required.';
        return '';
    };

    const validateCity = (value) => {
        if (!value || value.trim() === '') return 'Regency or city is required.';
        return '';
    };

    const validatePincode = (value) => {
        // Start Update 11 September 2026, by @WNP: Validate Indonesia's five-digit postal code format.
        if (!value || value.trim() === '') return 'Postal code is required.';
        if (!/^[0-9]{5}$/.test(value)) return 'Postal code must be exactly 5 digits.';
        return '';
    };

    // --- Bank Validations ---
    const validateBankName = (value) => {
        if (!value || value.trim() === '') return 'Bank Name is required.';
        return '';
    };

    const validateAccountNumber = (value) => {
        if (!value || value.trim() === '') return 'Account Number is required.';
        if (!/^[0-9]{9,18}$/.test(value)) return 'Account number must be 9 to 18 digits.';
        return '';
    };

    // Start Update 11 September 2026, by @WNP: Validate Indonesian three-digit bank codes.
    const validateBankCode = (value) => {
        if (!value || value.trim() === '') return 'Bank Code is required.';
        if (!BANK_CODE_REGEX.test(value)) return 'Bank Code must be exactly 3 digits.';
        return '';
    };

    const validateBranch = (value) => {
        if (!value || value.trim() === '') return 'Branch Name is required.';
        return '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        let hasError = false;
        const newErrors = {};

        if (activeTab === 'contact') {
            newErrors.contact_person = validateContactPerson(form.data.contact_person);
            newErrors.contact_phone = validatePhoneNumber(form.data.contact_phone);
            newErrors.address = validateAddress(form.data.address);
            newErrors.state = validateState(form.data.state);
            newErrors.city = validateCity(form.data.city);
            newErrors.pincode = validatePincode(form.data.pincode);
            hasError = Object.values(newErrors).some((e) => e !== '');
        }

        if (activeTab === 'bank') {
            newErrors.bank_name = validateBankName(form.data.bank_name);
            newErrors.bank_account_number = validateAccountNumber(form.data.bank_account_number);
            // Start Update 11 September 2026, by @WNP: Validate the Indonesian bank code on profile submission.
            newErrors.bank_ifsc = validateBankCode(form.data.bank_ifsc);
            newErrors.bank_branch = validateBranch(form.data.bank_branch);
            hasError = Object.values(newErrors).some((e) => e !== '');
        }

        if (hasError) {
            setClientErrors(newErrors);
            return;
        }

        setClientErrors({});
        form.put('/vendor/profile', {
            onSuccess: () => setIsEditing(false),
        });
    };

    const getError = (field) => t(clientErrors[field] || form.errors[field] || '');

    const tabs = [
        { id: 'company', label: 'Company Details', icon: 'vendors' },
        { id: 'contact', label: 'Contact Info', icon: 'messages' },
        { id: 'bank', label: 'Bank Details', icon: 'payments' },
        { id: 'status', label: 'Account Status', icon: 'metrics' },
    ];

    const header = (
        <PageHeader
            title="Profile"
            subtitle="Manage your company information"
            actions={
                <div className="flex items-center gap-3">
                    <Badge status={vendor?.status || 'draft'} size="lg" />
                    {!isEditing &&
                        vendor?.status !== 'draft' &&
                        activeTab !== 'company' &&
                        activeTab !== 'status' && (
                            <Button onClick={() => setIsEditing(true)}>{t('Edit Profile')}</Button>
                        )}
                </div>
            }
        />
    );

    // Helper for input field class with error styling
    const inputClass = (field) =>
        `w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
            getError(field)
                ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
        }`;

    return (
        <VendorLayout title="Profile" activeNav="Profile" header={header} vendor={vendor}>
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-(--color-bg-secondary) rounded-xl border border-(--color-border-secondary)">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab.id);
                                setClientErrors({});
                                if (tab.id === 'company' || tab.id === 'status') {
                                    setIsEditing(false);
                                }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-(--color-bg-primary) text-(--color-brand-primary) shadow-sm'
                                    : 'text-(--color-text-tertiary) hover:text-(--color-text-primary)'
                            }`}
                        >
                            <span className="inline-flex">
                                <AppIcon name={tab.icon} className="h-4 w-4" />
                            </span>
                            <span className="hidden sm:inline">{t(tab.label)}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    {/* ===== Company Details Tab (ALWAYS DISABLED) ===== */}
                    {activeTab === 'company' && (
                        <Card title="Company Details">
                            <div className="grid md:grid-cols-2 gap-6 p-6">
                                <FormInput
                                    label="Company Name"
                                    value={form.data.company_name}
                                    onChange={() => {}}
                                    required
                                    disabled={true}
                                />
                                <FormInput
                                    label="Registration Number (CIN / LLPIN)"
                                    value={form.data.registration_number}
                                    onChange={() => {}}
                                    disabled={true}
                                />
                                <FormInput
                                    label="GST Number"
                                    value={form.data.tax_id}
                                    onChange={() => {}}
                                    disabled={true}
                                />
                                <FormInput
                                    label="PAN Number"
                                    value={form.data.pan_number}
                                    onChange={() => {}}
                                    required
                                    disabled={true}
                                />
                                <div className="md:col-span-2">
                                    <FormSelect
                                        label="Business Type"
                                        value={form.data.business_type}
                                        onChange={() => {}}
                                        options={[
                                            {
                                                value: 'sole_proprietor',
                                                label: 'Sole Proprietorship',
                                            },
                                            { value: 'partnership', label: 'Partnership' },
                                            { value: 'pvt_ltd', label: 'Private Limited' },
                                            { value: 'public_ltd', label: 'Public Limited' },
                                            { value: 'llp', label: 'LLP' },
                                        ]}
                                        disabled={true}
                                    />
                                </div>
                                <div className="md:col-span-2 p-4 bg-(--color-bg-secondary) rounded-xl">
                                    <p className="text-sm text-(--color-text-tertiary) flex items-center gap-2">
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        {t(
                                            'Company details cannot be edited after submission. Contact admin for changes.'
                                        )}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* ===== Contact Info Tab (EDITABLE with Validations) ===== */}
                    {activeTab === 'contact' && (
                        <Card title="Contact Information">
                            <div className="grid md:grid-cols-2 gap-6 p-6">
                                {/* Contact Person */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Contact Person')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.contact_person}
                                        onChange={(e) => {
                                            form.setData('contact_person', e.target.value);
                                            if (clientErrors.contact_person) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    contact_person: validateContactPerson(
                                                        e.target.value
                                                    ),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    contact_person: validateContactPerson(
                                                        form.data.contact_person
                                                    ),
                                                }));
                                            }
                                        }}
                                        className={inputClass('contact_person')}
                                        placeholder={t('Full name of contact person')}
                                        disabled={!isEditing}
                                    />
                                    {getError('contact_person') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('contact_person')}
                                        </p>
                                    )}
                                </div>

                                {/* Phone Number / Mobile */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Phone Number / Mobile')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    {/* Start Update 14 September 2026, by @WNP: Support 08 and +628 mobile entry with matching length limits. */}
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        value={form.data.contact_phone}
                                        onChange={(e) => {
                                            const val = sanitizeIndonesianMobileInput(
                                                e.target.value
                                            );
                                            form.setData('contact_phone', val);
                                            if (clientErrors.contact_phone) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    contact_phone: validatePhoneNumber(val),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    contact_phone: validatePhoneNumber(
                                                        form.data.contact_phone
                                                    ),
                                                }));
                                            }
                                        }}
                                        className={inputClass('contact_phone')}
                                        placeholder="081234567890"
                                        disabled={!isEditing}
                                    />
                                    {isEditing && (
                                        <p className="text-xs text-(--color-text-tertiary)">
                                            {t('Use 08... or +628... for a mobile number.')}
                                        </p>
                                    )}
                                    {getError('contact_phone') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('contact_phone')}
                                        </p>
                                    )}
                                </div>

                                {/* Email */}
                                <FormInput
                                    label="Email Address"
                                    type="email"
                                    value={form.data.contact_email}
                                    onChange={() => {}}
                                    disabled={true}
                                />

                                {/* Address */}
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Registered Address')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <textarea
                                        value={form.data.address}
                                        onChange={(e) => {
                                            form.setData('address', e.target.value);
                                            if (clientErrors.address) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    address: validateAddress(e.target.value),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    address: validateAddress(form.data.address),
                                                }));
                                            }
                                        }}
                                        className={`${inputClass('address')} min-h-[80px]`}
                                        placeholder={t('Full street address')}
                                        disabled={!isEditing}
                                    />
                                    {getError('address') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('address')}
                                        </p>
                                    )}
                                </div>

                                {/* Start Update 11 September 2026, by @WNP: Replace the Indian state dropdown with Indonesian provinces. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Province')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <FormSelect
                                        value={form.data.state}
                                        onChange={(value) => {
                                            form.setData((prev) => ({
                                                ...prev,
                                                state: value,
                                                city: '',
                                            }));
                                            if (clientErrors.state) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    state: validateState(value),
                                                    city: '',
                                                }));
                                            }
                                        }}
                                        placeholder="Select Province"
                                        options={INDONESIAN_PROVINCES}
                                        error={getError('state')}
                                        disabled={!isEditing}
                                    />
                                </div>

                                {/* Start Update 11 September 2026, by @WNP: Replace the city dropdown with Indonesian regencies and cities. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Regency / City')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <FormSelect
                                        value={form.data.city}
                                        onChange={(value) => {
                                            form.setData('city', value);
                                            if (clientErrors.city) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    city: validateCity(value),
                                                }));
                                            }
                                        }}
                                        placeholder={
                                            form.data.state
                                                ? 'Select Regency / City'
                                                : 'Select Province first'
                                        }
                                        options={cityOptions}
                                        disabled={!isEditing || !form.data.state}
                                        error={getError('city')}
                                    />
                                </div>

                                {/* Start Update 11 September 2026, by @WNP: Use Indonesia's postal code label and five-digit input rules. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Postal Code')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.pincode}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            form.setData('pincode', val);
                                            if (clientErrors.pincode) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    pincode: validatePincode(val),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    pincode: validatePincode(form.data.pincode),
                                                }));
                                            }
                                        }}
                                        className={inputClass('pincode')}
                                        placeholder={t('5-digit postal code')}
                                        maxLength={5}
                                        disabled={!isEditing}
                                    />
                                    {getError('pincode') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('pincode')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* ===== Bank Details Tab (EDITABLE with Validations) ===== */}
                    {activeTab === 'bank' && (
                        <Card title="Bank Details">
                            <div className="grid md:grid-cols-2 gap-6 p-6">
                                {/* Start Update 11 September 2026, by @WNP: Use Indonesian bank naming and local bank-code resolution. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Bank Name')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.bank_name}
                                        onChange={(e) => {
                                            form.setData('bank_name', e.target.value);
                                            if (clientErrors.bank_name) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    bank_name: validateBankName(e.target.value),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    bank_name: validateBankName(
                                                        form.data.bank_name
                                                    ),
                                                }));
                                            }
                                        }}
                                        className={`${inputClass('bank_name')} ${resolvedBank ? 'bg-(--color-bg-secondary)' : ''}`}
                                        placeholder={t('e.g., Bank Mandiri')}
                                        readOnly={Boolean(resolvedBank)}
                                        disabled={!isEditing}
                                    />
                                    {getError('bank_name') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('bank_name')}
                                        </p>
                                    )}
                                </div>

                                {/* Account Number */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Account Number')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.bank_account_number}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            form.setData('bank_account_number', val);
                                            if (clientErrors.bank_account_number) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    bank_account_number: validateAccountNumber(val),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    bank_account_number: validateAccountNumber(
                                                        form.data.bank_account_number
                                                    ),
                                                }));
                                            }
                                        }}
                                        className={inputClass('bank_account_number')}
                                        placeholder={t('9-18 digit account number')}
                                        maxLength={18}
                                        disabled={!isEditing}
                                    />
                                    {getError('bank_account_number') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('bank_account_number')}
                                        </p>
                                    )}
                                </div>

                                {/* Start Update 11 September 2026, by @WNP: Use an Indonesian bank code field with local name lookup. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Bank Code')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.data.bank_ifsc}
                                            onChange={(e) => {
                                                const code = e.target.value
                                                    .replace(/\D/g, '')
                                                    .slice(0, 3);
                                                const bank = findIndonesianBankByCode(code);
                                                form.setData((prev) => ({
                                                    ...prev,
                                                    bank_ifsc: code,
                                                    bank_name:
                                                        bank?.name ||
                                                        (resolvedBank ? '' : prev.bank_name),
                                                }));
                                                if (clientErrors.bank_ifsc) {
                                                    setClientErrors((prev) => ({
                                                        ...prev,
                                                        bank_ifsc: validateBankCode(code),
                                                    }));
                                                }
                                            }}
                                            onBlur={() => {
                                                if (isEditing) {
                                                    const bankCodeError = validateBankCode(
                                                        form.data.bank_ifsc
                                                    );
                                                    setClientErrors((prev) => ({
                                                        ...prev,
                                                        bank_ifsc: bankCodeError,
                                                    }));
                                                }
                                            }}
                                            className={`${inputClass('bank_ifsc')} pr-10`}
                                            placeholder="008"
                                            inputMode="numeric"
                                            maxLength={3}
                                            disabled={!isEditing}
                                        />
                                        {resolvedBank && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <svg
                                                    className="h-5 w-5 text-(--color-success)"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-(--color-text-tertiary)">
                                        {t(
                                            'Bank name is filled automatically for recognized Indonesian bank codes.'
                                        )}
                                    </p>
                                    {getError('bank_ifsc') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('bank_ifsc')}
                                        </p>
                                    )}
                                </div>

                                {/* Start Update 11 September 2026, by @WNP: Keep branch manual because Indonesian bank codes do not identify an individual branch. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Branch Name')}{' '}
                                        <span className="text-(--color-danger)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.bank_branch}
                                        onChange={(e) => {
                                            form.setData('bank_branch', e.target.value);
                                            if (clientErrors.bank_branch) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    bank_branch: validateBranch(e.target.value),
                                                }));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isEditing) {
                                                setClientErrors((prev) => ({
                                                    ...prev,
                                                    bank_branch: validateBranch(
                                                        form.data.bank_branch
                                                    ),
                                                }));
                                            }
                                        }}
                                        className={inputClass('bank_branch')}
                                        placeholder={t('e.g., KCP Jakarta Menteng')}
                                        disabled={!isEditing}
                                    />
                                    <p className="text-xs text-(--color-text-tertiary)">
                                        {t('Enter the branch registered for this account.')}
                                    </p>
                                    {getError('bank_branch') && (
                                        <p className="text-sm text-(--color-danger)">
                                            {getError('bank_branch')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* ===== Account Status Tab ===== */}
                    {activeTab === 'status' && (
                        <div className="space-y-6">
                            <Card title="Account Status">
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-(--color-bg-secondary) rounded-xl">
                                        <div>
                                            <div className="text-sm text-(--color-text-tertiary)">
                                                {t('Current Status')}
                                            </div>
                                            <div className="text-lg font-semibold text-(--color-text-primary) capitalize mt-1">
                                                {vendor?.status?.replaceAll('_', ' ') || 'Draft'}
                                            </div>
                                        </div>
                                        <Badge status={vendor?.status || 'draft'} size="lg" />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-(--color-bg-secondary) rounded-xl">
                                            <div className="text-sm text-(--color-text-tertiary)">
                                                {t('Compliance Score')}
                                            </div>
                                            <div
                                                className={`text-2xl font-bold mt-1 ${
                                                    (vendor?.compliance_score || 0) >= 80
                                                        ? 'text-(--color-success)'
                                                        : (vendor?.compliance_score || 0) >= 50
                                                          ? 'text-(--color-warning)'
                                                          : 'text-(--color-danger)'
                                                }`}
                                            >
                                                {vendor?.compliance_score || 0}%
                                            </div>
                                        </div>
                                        <div className="p-4 bg-(--color-bg-secondary) rounded-xl">
                                            <div className="text-sm text-(--color-text-tertiary)">
                                                {t('Performance Score')}
                                            </div>
                                            <div className="text-2xl font-bold text-(--color-brand-primary) mt-1">
                                                {vendor?.performance_score || 0}/100
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-(--color-bg-secondary) rounded-xl">
                                        <div className="text-sm text-(--color-text-tertiary)">
                                            {t('Member Since')}
                                        </div>
                                        <div className="text-lg font-semibold text-(--color-text-primary) mt-1">
                                            {vendor?.created_at
                                                ? formatDate(vendor.created_at)
                                                : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Action Buttons - Only show on editable tabs */}
                    {isEditing && (activeTab === 'contact' || activeTab === 'bank') && (
                        <div className="flex justify-end gap-3 mt-6">
                            {/* Start Update 11 September 2026, by @WNP: Reset form data without obsolete external bank lookup state. */}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditing(false);
                                    setClientErrors({});
                                    form.reset();
                                }}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? t('Saving...') : t('Save Changes')}
                            </Button>
                        </div>
                    )}
                </form>
            </div>
        </VendorLayout>
    );
}
