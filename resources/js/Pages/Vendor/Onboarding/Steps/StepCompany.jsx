import VendorCategoryTooltip from '@/Components/VendorCategoryTooltip';
import { vendorCategoryLabel } from '@/i18n/vendorCategories';
import { DisabledButton } from '@/Components/DisabledActionTooltip';
import { useForm } from '@inertiajs/react';
import { FormSelect } from '@/Components/index.jsx';
import VendorFormSelect from '@/Pages/Vendor/Components/VendorFormSelect';
import { useState, useMemo } from 'react';
// Use the centralized Indonesian province and regency/city dataset.
import { INDONESIAN_PROVINCES, getRegenciesForProvince } from '@/data/indonesianProvincesAndCities';
// Translate the company onboarding step through the global language context.
import { useLanguage } from '@/Contexts/LanguageContext';
import { businessTypeOptions } from '@/i18n/businessTypes';
// Reuse VMS Indonesian mobile-number input and validation rules.
import {
    sanitizeIndonesianMobileInput,
    validateIndonesianMobileNumber as validatePhoneNumber,
} from '@/utils/indonesianMobilePhone';
// Reuse Indonesian NIB and NPWP input rules during onboarding.
import {
    sanitizeBusinessIdentifier,
    validateNib,
    validateNpwp,
} from '@/utils/indonesianBusinessIdentifiers';

export default function StepCompany({
    vendor,
    sessionData,
    vendorCategories = [],
    businessTypes = [],
}) {
    const { language, t } = useLanguage();
    const step1Session = sessionData?.step1 || {};
    const { data, setData, post, processing, errors } = useForm({
        company_name: step1Session.company_name || vendor?.company_name || '',
        business_identification_number:
            step1Session.business_identification_number ||
            vendor?.business_identification_number ||
            '',
        tax_id: step1Session.tax_id || vendor?.tax_id || '',
        // Collect the vendor deed number during company onboarding.
        deed_number: step1Session.deed_number || vendor?.deed_number || '',
        business_type: step1Session.business_type || vendor?.business_type || '',
        category_id: step1Session.category_id || vendor?.category_id || '',
        experience: step1Session.experience || vendor?.experience || '',
        contact_person: step1Session.contact_person || vendor?.contact_person || '',
        contact_phone: step1Session.contact_phone || vendor?.contact_phone || '',
        address: step1Session.address || vendor?.address || '',
        city: step1Session.city || vendor?.city || '',
        state: step1Session.state || vendor?.state || '',
        pincode: step1Session.pincode || vendor?.pincode || '',
    });

    const [clientErrors, setClientErrors] = useState({});

    // Validate every required company field before stopping the client-side submission.
    const validateCompanyName = (value) => {
        if (!value || value.trim() === '') {
            return 'Company Name is required.';
        }
        if (value.length > 255) {
            return 'Company Name may not exceed 255 characters.';
        }
        return '';
    };

    const validateContactPerson = (value) => {
        if (!value || value.trim() === '') {
            return 'Contact Person is required.';
        }
        if (value.length > 255) {
            return 'Contact Person may not exceed 255 characters.';
        }
        return '';
    };

    const validateAddress = (value) => {
        if (!value || value.trim() === '') {
            return 'Address is required.';
        }
        if (value.length > 500) {
            return 'Address may not exceed 500 characters.';
        }
        return '';
    };

    const validateState = (value) => {
        if (!value || value.trim() === '') {
            return 'Province is required.';
        }
        return '';
    };

    const validateCity = (value) => {
        if (!value || value.trim() === '') {
            return 'Regency or city is required.';
        }
        return '';
    };

    // Validate Indonesia's five-digit postal code format in the onboarding form.
    const validatePostalCode = (value) => {
        if (!value || value.trim() === '') {
            return 'Postal code is required.';
        }
        if (!/^[0-9]{5}$/.test(value)) {
            return 'Postal code must be exactly 5 digits.';
        }
        return '';
    };

    const validateBusinessType = (value) => {
        if (!value || value.trim() === '') {
            return 'Business Type is required.';
        }
        return '';
    };

    const validateCategory = (value) => {
        if (!value) return 'Category is required.';
        return vendorCategories.some(
            (category) =>
                String(category.id) === String(value) &&
                (category.is_active !== false ||
                    String(value) === String(step1Session.category_id || vendor?.category_id))
        )
            ? ''
            : 'Please select a valid category.';
    };

    const validateExperience = (value) => {
        if (!value || value.trim() === '') return 'Experience is required.';
        if (value.length > 2000) return 'Experience may not exceed 2000 characters.';
        return '';
    };

    // Require a concise deed number before advancing onboarding.
    const validateDeedNumber = (value) => {
        if (!value || value.trim() === '') {
            return 'Deed of Establishment Number is required.';
        }
        if (value.length > 100) {
            return 'Deed of Establishment Number may not exceed 100 characters.';
        }
        return '';
    };

    // Derive regency/city options only when the selected province changes.
    const cityOptions = useMemo(() => getRegenciesForProvince(data.state), [data.state]);
    const categoryOptions = useMemo(
        () =>
            vendorCategories
                .filter(
                    (category) =>
                        category.is_active !== false ||
                        String(category.id) === String(data.category_id)
                )
                .map((category) => ({
                    value: String(category.id),
                    label: vendorCategoryLabel(language, category),
                })),
        [vendorCategories, language, data.category_id]
    );

    const submit = (e) => {
        e.preventDefault();
        if (processing) return;

        // Validate all required company fields before submitting company data.
        const companyNameError = validateCompanyName(data.company_name);
        const nibError = validateNib(data.business_identification_number);
        const npwpError = validateNpwp(data.tax_id);
        const deedNumberError = validateDeedNumber(data.deed_number);
        const contactError = validateContactPerson(data.contact_person);
        const phoneError = validatePhoneNumber(data.contact_phone);
        const addressError = validateAddress(data.address);
        const stateError = validateState(data.state);
        const cityError = validateCity(data.city);
        // Include postal code validation before submitting onboarding data.
        const postalCodeError = validatePostalCode(data.pincode);
        const bizError = validateBusinessType(data.business_type);
        const categoryError = validateCategory(data.category_id);
        const experienceError = validateExperience(data.experience);

        if (
            companyNameError ||
            nibError ||
            npwpError ||
            deedNumberError ||
            contactError ||
            phoneError ||
            addressError ||
            stateError ||
            cityError ||
            postalCodeError ||
            bizError ||
            categoryError ||
            experienceError
        ) {
            setClientErrors({
                company_name: companyNameError,
                business_identification_number: nibError,
                tax_id: npwpError,
                deed_number: deedNumberError,
                contact_person: contactError,
                contact_phone: phoneError,
                address: addressError,
                state: stateError,
                city: cityError,
                pincode: postalCodeError,
                business_type: bizError,
                category_id: categoryError,
                experience: experienceError,
            });
            return;
        }

        setClientErrors({});
        post('/vendor/onboarding/step1');
    };

    return (
        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-2xl min-w-0 p-4 sm:p-8 md:p-12 shadow-token-lg animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-(--color-text-primary)">
                    {t('Company Information')}
                </h1>
                <p className="text-(--color-text-tertiary)">
                    {t('Tell us about your business entity.')}
                </p>
            </div>

            <div className="mb-8 rounded-xl border border-(--color-border-secondary) bg-(--color-bg-secondary) p-5">
                <h2 className="mb-3 text-sm font-semibold text-(--color-text-primary)">
                    {t('FILLING INSTRUCTIONS:')}
                </h2>
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed wrap-break-word text-(--color-text-secondary)">
                    <li>{t('Complete all fields using your company’s information.')}</li>
                    <li>
                        {t('Select a Category from the available dropdown.')}
                        <ul className="mt-2 list-disc space-y-2 pl-5">
                            <li>
                                {t(
                                    'General Information (Company Name, Business Type, Registered Address, Province, Regency / City, Postal Code, Contact Person, WhatsApp Number, NIB, NPWP, Deed of Establishment Number)'
                                )}
                            </li>
                            <li>
                                {t(
                                    'Bank Information (Bank Code, Bank Name, Account Number, Branch Name)'
                                )}
                            </li>
                            <li>
                                {t(
                                    'Upload the administrative documents requested in the Documents step.'
                                )}
                            </li>
                        </ul>
                    </li>
                    <li>{t('Enter the WhatsApp Number in the format 08xxxxxxxxxx.')}</li>
                    <li>{t('Ensure the NIB & NPWP match the official documents.')}</li>
                    <li>
                        {t(
                            'Enter examples of projects or work previously completed in the Experience field.'
                        )}
                    </li>
                    <li>
                        {t('This file will be used as material for Vendor PPM 2026 registration.')}
                    </li>
                </ol>
            </div>

            <p className="mb-4 text-sm text-(--color-text-tertiary)">
                {t('Fields marked with * are required.')}
            </p>
            <form noValidate onSubmit={submit} className="space-y-8">
                <div className="grid min-w-0 md:grid-cols-2 gap-6">
                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-company_name"
                        >
                            {t('Company Name')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-company_name"
                            name="company_name"
                            aria-invalid={Boolean(clientErrors.company_name || errors.company_name)}
                            aria-describedby={
                                clientErrors.company_name || errors.company_name
                                    ? 'onboarding-company_name-error'
                                    : undefined
                            }
                            type="text"
                            value={data.company_name}
                            onChange={(e) => {
                                const value = e.target.value;
                                setData('company_name', value);
                                if (clientErrors.company_name) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        company_name: validateCompanyName(value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    company_name: validateCompanyName(data.company_name),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.company_name || errors.company_name
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., PPM Manajemen')}
                            maxLength={255}
                        />
                        {/* Show company-name validation from both client and server checks. */}
                        {(clientErrors.company_name || errors.company_name) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-company_name-error"
                                role="alert"
                            >
                                {t(clientErrors.company_name || errors.company_name)}
                            </p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2">
                        <VendorFormSelect
                            label="Business Type"
                            showRequiredIndicator
                            value={data.business_type}
                            onChange={(value) => {
                                setData('business_type', value);
                                if (clientErrors.business_type) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        business_type: validateBusinessType(value),
                                    }));
                                }
                            }}
                            placeholder={t('Select Type')}
                            options={businessTypeOptions(language, businessTypes)}
                            translateOptions={false}
                            error={clientErrors.business_type || errors.business_type}
                        />
                    </div>

                    <div className="min-w-0 space-y-2">
                        <div className="flex min-w-0 items-center gap-1">
                            <label
                                htmlFor="company-category"
                                className="text-sm font-medium text-(--color-text-secondary)"
                            >
                                {t('Category')}{' '}
                                <span className="text-(--color-danger)" aria-hidden="true">
                                    *
                                </span>
                            </label>
                            <VendorCategoryTooltip
                                category={vendorCategories.find(
                                    (category) => String(category.id) === String(data.category_id)
                                )}
                            />
                        </div>
                        <FormSelect
                            size="field"
                            showRequiredIndicator
                            id="company-category"
                            aria-label="Category"
                            value={String(data.category_id)}
                            onChange={(value) => {
                                setData('category_id', value);
                                if (clientErrors.category_id) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        category_id: validateCategory(value),
                                    }));
                                }
                            }}
                            placeholder={t('Select Category')}
                            options={categoryOptions}
                            translateOptions={false}
                            error={clientErrors.category_id || errors.category_id}
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-experience"
                        >
                            {t('Experience')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <textarea
                            id="onboarding-experience"
                            name="experience"
                            aria-invalid={Boolean(clientErrors.experience || errors.experience)}
                            aria-describedby={
                                clientErrors.experience || errors.experience
                                    ? 'onboarding-experience-error'
                                    : undefined
                            }
                            value={data.experience}
                            onChange={(e) => {
                                const value = e.target.value;
                                setData('experience', value);
                                if (clientErrors.experience) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        experience: validateExperience(value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    experience: validateExperience(data.experience),
                                }));
                            }}
                            className={`min-h-[120px] w-full rounded-lg border bg-(--color-bg-primary) px-4 py-3 text-sm outline-none transition-all focus:ring-2 ${
                                clientErrors.experience || errors.experience
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., Software procurement for PPM Manajemen in 2025.')}
                            maxLength={2000}
                        />
                        <p className="text-xs text-(--color-text-tertiary)">
                            {t('Describe projects or work previously completed by your company.')}
                        </p>
                        {(clientErrors.experience || errors.experience) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-experience-error"
                                role="alert"
                            >
                                {t(clientErrors.experience || errors.experience)}
                            </p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-business_identification_number"
                        >
                            {/* Show the complete business identifier label. */}
                            {t('Business Identification Number (NIB)')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-business_identification_number"
                            name="business_identification_number"
                            aria-invalid={Boolean(
                                clientErrors.business_identification_number ||
                                errors.business_identification_number
                            )}
                            aria-describedby={
                                clientErrors.business_identification_number ||
                                errors.business_identification_number
                                    ? 'onboarding-business_identification_number-error'
                                    : undefined
                            }
                            type="text"
                            value={data.business_identification_number}
                            onChange={(e) => {
                                // Accept pasted NIB separators while storing digits only.
                                const val = sanitizeBusinessIdentifier(e.target.value, 13);
                                setData('business_identification_number', val);
                                if (clientErrors.business_identification_number) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        business_identification_number: validateNib(val),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    business_identification_number: validateNib(
                                        data.business_identification_number
                                    ),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.business_identification_number ||
                                errors.business_identification_number
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., 1234567890123')}
                            inputMode="numeric"
                            maxLength={13}
                        />
                        {/* Localize registration-number validation feedback. */}
                        {(clientErrors.business_identification_number ||
                            errors.business_identification_number) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-business_identification_number-error"
                                role="alert"
                            >
                                {t(
                                    clientErrors.business_identification_number ||
                                        errors.business_identification_number
                                )}
                            </p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-tax_id"
                        >
                            {/* Show the complete taxpayer identifier label. */}
                            {t('Taxpayer Identification Number (NPWP)')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-tax_id"
                            name="tax_id"
                            aria-invalid={Boolean(clientErrors.tax_id || errors.tax_id)}
                            aria-describedby={
                                clientErrors.tax_id || errors.tax_id
                                    ? 'onboarding-tax_id-error'
                                    : undefined
                            }
                            type="text"
                            value={data.tax_id}
                            onChange={(e) => {
                                // Normalize formatted NPWP input to digits only.
                                const val = sanitizeBusinessIdentifier(e.target.value, 16);
                                setData('tax_id', val);
                                if (clientErrors.tax_id) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        tax_id: validateNpwp(val),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    tax_id: validateNpwp(data.tax_id),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.tax_id || errors.tax_id
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., 0123456789012345')}
                            inputMode="numeric"
                            maxLength={16}
                        />
                        {/* Localize tax-number validation feedback. */}
                        {(clientErrors.tax_id || errors.tax_id) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-tax_id-error"
                                role="alert"
                            >
                                {t(clientErrors.tax_id || errors.tax_id)}
                            </p>
                        )}
                    </div>

                    {/* Match the deed-number field width to the other company identifiers. */}
                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-deed_number"
                        >
                            {t('Deed of Establishment Number')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-deed_number"
                            name="deed_number"
                            aria-invalid={Boolean(clientErrors.deed_number || errors.deed_number)}
                            aria-describedby={
                                clientErrors.deed_number || errors.deed_number
                                    ? 'onboarding-deed_number-error'
                                    : undefined
                            }
                            type="text"
                            value={data.deed_number}
                            onChange={(e) => {
                                const value = e.target.value;
                                setData('deed_number', value);
                                if (clientErrors.deed_number) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        deed_number: validateDeedNumber(value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    deed_number: validateDeedNumber(data.deed_number),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.deed_number || errors.deed_number
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., AHU-0012345')}
                            maxLength={100}
                        />
                        {(clientErrors.deed_number || errors.deed_number) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-deed_number-error"
                                role="alert"
                            >
                                {t(clientErrors.deed_number || errors.deed_number)}
                            </p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-contact_person"
                        >
                            {t('Contact Person')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-contact_person"
                            name="contact_person"
                            aria-invalid={Boolean(
                                clientErrors.contact_person || errors.contact_person
                            )}
                            aria-describedby={
                                clientErrors.contact_person || errors.contact_person
                                    ? 'onboarding-contact_person-error'
                                    : undefined
                            }
                            type="text"
                            value={data.contact_person}
                            onChange={(e) => {
                                setData('contact_person', e.target.value);
                                if (clientErrors.contact_person) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        contact_person: validateContactPerson(e.target.value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    contact_person: validateContactPerson(data.contact_person),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.contact_person || errors.contact_person
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., John Doe')}
                            maxLength={255}
                        />
                        {/* Localize contact-person validation feedback. */}
                        {(clientErrors.contact_person || errors.contact_person) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-contact_person-error"
                                role="alert"
                            >
                                {t(clientErrors.contact_person || errors.contact_person)}
                            </p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-contact_phone"
                        >
                            {t('WhatsApp Number')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-contact_phone"
                            name="contact_phone"
                            aria-invalid={Boolean(
                                clientErrors.contact_phone || errors.contact_phone
                            )}
                            aria-describedby={
                                clientErrors.contact_phone || errors.contact_phone
                                    ? 'onboarding-contact_phone-error'
                                    : undefined
                            }
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={data.contact_phone}
                            onChange={(e) => {
                                const val = sanitizeIndonesianMobileInput(e.target.value);
                                setData('contact_phone', val);
                                if (clientErrors.contact_phone) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        contact_phone: validatePhoneNumber(val),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    contact_phone: validatePhoneNumber(data.contact_phone),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.contact_phone || errors.contact_phone
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., 081234567890')}
                            maxLength={13}
                        />
                        <p className="text-xs text-(--color-text-tertiary)">
                            {t('Use the 08xxxxxxxxxx format and digits only.')}
                        </p>
                        {/* Localize contact-phone validation feedback. */}
                        {(clientErrors.contact_phone || errors.contact_phone) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-contact_phone-error"
                                role="alert"
                            >
                                {t(clientErrors.contact_phone || errors.contact_phone)}
                            </p>
                        )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-address"
                        >
                            {t('Registered Address')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <textarea
                            id="onboarding-address"
                            name="address"
                            aria-invalid={Boolean(clientErrors.address || errors.address)}
                            aria-describedby={
                                clientErrors.address || errors.address
                                    ? 'onboarding-address-error'
                                    : undefined
                            }
                            value={data.address}
                            onChange={(e) => {
                                const value = e.target.value;
                                setData('address', value);
                                if (clientErrors.address) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        address: validateAddress(value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    address: validateAddress(data.address),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all min-h-[80px] ${
                                clientErrors.address || errors.address
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder={t('e.g., Jl. Menteng Raya 9-19, Menteng, Central Jakarta')}
                            maxLength={500}
                        ></textarea>
                        {/* Show registered-address validation from both client and server checks. */}
                        {(clientErrors.address || errors.address) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-address-error"
                                role="alert"
                            >
                                {t(clientErrors.address || errors.address)}
                            </p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            htmlFor="company-province"
                            className="text-sm font-medium text-(--color-text-secondary)"
                        >
                            {/* Use Indonesian address terminology for province selection. */}
                            {t('Province')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <FormSelect
                            size="field"
                            showRequiredIndicator
                            id="company-province"
                            aria-label="Province"
                            value={data.state}
                            onChange={(value) => {
                                setData((prev) => ({ ...prev, state: value, city: '' }));
                                if (clientErrors.state) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        state: validateState(value),
                                        city: '',
                                    }));
                                }
                            }}
                            placeholder={t('Select Province')}
                            options={INDONESIAN_PROVINCES}
                            translateOptions={false}
                            error={clientErrors.state || errors.state}
                        />
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            htmlFor="company-city"
                            className="text-sm font-medium text-(--color-text-secondary)"
                        >
                            {/* Include both Indonesian regencies and cities. */}
                            {t('Regency / City')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <FormSelect
                            size="field"
                            showRequiredIndicator
                            id="company-city"
                            aria-label="Regency / City"
                            value={data.city}
                            onChange={(value) => {
                                setData('city', value);
                                if (clientErrors.city) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        city: validateCity(value),
                                    }));
                                }
                            }}
                            placeholder={
                                data.state ? t('Select Regency / City') : t('Select Province first')
                            }
                            options={cityOptions}
                            translateOptions={false}
                            disabled={!data.state}
                            disabledReason="Select a province before choosing a city."
                            error={clientErrors.city || errors.city}
                        />
                    </div>

                    <div className="min-w-0 space-y-2">
                        <label
                            className="text-sm font-medium text-(--color-text-secondary)"
                            htmlFor="onboarding-pincode"
                        >
                            {/* Use Indonesia's postal code label and five-digit input rules. */}
                            {t('Postal Code')}{' '}
                            <span className="text-(--color-danger)" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="onboarding-pincode"
                            name="pincode"
                            aria-invalid={Boolean(clientErrors.pincode || errors.pincode)}
                            aria-describedby={
                                clientErrors.pincode || errors.pincode
                                    ? 'onboarding-pincode-error'
                                    : undefined
                            }
                            type="text"
                            value={data.pincode}
                            onChange={(e) => setData('pincode', e.target.value.replace(/\D/g, ''))}
                            onBlur={() =>
                                setClientErrors((prev) => ({
                                    ...prev,
                                    pincode: validatePostalCode(data.pincode),
                                }))
                            }
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.pincode || errors.pincode
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            maxLength={5}
                            pattern="[0-9]{5}"
                            title="Exactly 5 digits"
                            placeholder={t('e.g., 10340')}
                        />
                        {/* Localize postal-code validation feedback. */}
                        {(clientErrors.pincode || errors.pincode) && (
                            <p
                                className="text-sm text-(--color-danger)"
                                id="onboarding-pincode-error"
                                role="alert"
                            >
                                {t(clientErrors.pincode || errors.pincode)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <DisabledButton
                        type="submit"
                        disabled={processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        className="theme-primary-action font-semibold rounded-lg shadow-token-primary hover:-translate-y-px hover:shadow-token-primary transition-all flex items-center gap-2 text-lg px-8 py-3"
                    >
                        {processing ? t('Saving...') : t('Save & Continue')}
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                        </svg>
                    </DisabledButton>
                </div>
            </form>
        </div>
    );
}
