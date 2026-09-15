import { useForm } from '@inertiajs/react';
import { FormSelect } from '@/Components/index.jsx';
import { useState, useMemo } from 'react';
// Start Update 11 September 2026, by @WNP: Use the centralized Indonesian province and regency/city dataset.
import { INDONESIAN_PROVINCES, getRegenciesForProvince } from '@/data/indonesianProvincesAndCities';
// Start Update 11 September 2026, by @WNP: Translate the company onboarding step through the global language context.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 14 September 2026, by @WNP: Reuse VMS Indonesian mobile-number input and validation rules.
import {
    sanitizeIndonesianMobileInput,
    validateIndonesianMobileNumber as validatePhoneNumber,
} from '@/utils/indonesianMobilePhone';

export default function StepCompany({ vendor, sessionData }) {
    const { t } = useLanguage();
    const step1Session = sessionData?.step1 || {};
    const { data, setData, post, processing, errors } = useForm({
        company_name: step1Session.company_name || vendor?.company_name || '',
        registration_number: step1Session.registration_number || vendor?.registration_number || '',
        tax_id: step1Session.tax_id || vendor?.tax_id || '',
        pan_number: step1Session.pan_number || vendor?.pan_number || '',
        business_type: step1Session.business_type || vendor?.business_type || '',
        contact_person: step1Session.contact_person || vendor?.contact_person || '',
        contact_phone: step1Session.contact_phone || vendor?.contact_phone || '',
        address: step1Session.address || vendor?.address || '',
        city: step1Session.city || vendor?.city || '',
        state: step1Session.state || vendor?.state || '',
        pincode: step1Session.pincode || vendor?.pincode || '',
    });

    const [clientErrors, setClientErrors] = useState({});

    // CIN: U12345MH2020PTC123456 (21 chars) or LLPIN: AAA-1234
    const CIN_LLPIN_REGEX = /^([UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}|[A-Z]{3}-[0-9]{4})$/;
    // GSTIN: 22AAAAA0000A1Z5 (15 chars)
    const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

    const validateRegistrationNumber = (value) => {
        if (!value || value.trim() === '') {
            return 'Registration Number (CIN / LLPIN) is required.';
        }
        if (!CIN_LLPIN_REGEX.test(value)) {
            return 'Enter a valid CIN (e.g. U12345MH2020PTC123456) or LLPIN (e.g. AAA-1234).';
        }
        return '';
    };

    const validateGstNumber = (value) => {
        if (!value || value.trim() === '') {
            return 'GST Number is required.';
        }
        if (value.length !== 15) {
            return 'GST Number must be exactly 15 characters.';
        }
        if (!GST_REGEX.test(value)) {
            return 'Enter a valid GSTIN (e.g. 22AAAAA0000A1Z5).';
        }
        return '';
    };

    const validateContactPerson = (value) => {
        if (!value || value.trim() === '') {
            return 'Contact Person is required.';
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

    // Start Update 11 September 2026, by @WNP: Validate Indonesia's five-digit postal code format in the onboarding form.
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

    // Start Update 11 September 2026, by @WNP: Derive regency/city options only when the selected province changes.
    const cityOptions = useMemo(() => getRegenciesForProvince(data.state), [data.state]);

    const submit = (e) => {
        e.preventDefault();

        const regError = validateRegistrationNumber(data.registration_number);
        const gstError = validateGstNumber(data.tax_id);
        const contactError = validateContactPerson(data.contact_person);
        const phoneError = validatePhoneNumber(data.contact_phone);
        const stateError = validateState(data.state);
        const cityError = validateCity(data.city);
        // Start Update 11 September 2026, by @WNP: Include postal code validation before submitting onboarding data.
        const postalCodeError = validatePostalCode(data.pincode);
        const bizError = validateBusinessType(data.business_type);

        if (
            regError ||
            gstError ||
            contactError ||
            phoneError ||
            stateError ||
            cityError ||
            postalCodeError ||
            bizError
        ) {
            setClientErrors({
                registration_number: regError,
                tax_id: gstError,
                contact_person: contactError,
                contact_phone: phoneError,
                state: stateError,
                city: cityError,
                pincode: postalCodeError,
                business_type: bizError,
            });
            return;
        }

        setClientErrors({});
        post('/vendor/onboarding/step1');
    };

    return (
        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-2xl p-8 md:p-12 shadow-token-lg animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-(--color-text-primary)">
                    {t('Company Information')}
                </h1>
                <p className="text-(--color-text-tertiary)">
                    {t('Tell us about your business entity.')}
                </p>
            </div>

            <form onSubmit={submit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Company Name')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.company_name}
                            onChange={(e) => setData('company_name', e.target.value)}
                            className="w-full px-4 py-3 bg-(--color-bg-primary) border border-(--color-border-primary) rounded-lg text-sm focus:border-(--color-border-focus) focus:ring-2 focus:ring-(--color-brand-primary)/20 outline-none transition-all"
                            placeholder={t('Legal Entity Name')}
                        />
                        {/* Start Update 12 September 2026, by @WNP: Localize the company-name validation alert. */}
                        {errors.company_name && (
                            <p className="text-sm text-(--color-danger)">
                                {t(errors.company_name)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Business Type')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <FormSelect
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
                            options={[
                                { value: 'sole_proprietor', label: 'Sole Proprietorship' },
                                { value: 'partnership', label: 'Partnership' },
                                { value: 'llp', label: 'LLP' },
                                { value: 'pvt_ltd', label: 'Private Limited' },
                                { value: 'public_ltd', label: 'Public Limited' },
                            ]}
                            error={clientErrors.business_type || errors.business_type}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Registration Number')}{' '}
                            <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.registration_number}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setData('registration_number', val);
                                if (clientErrors.registration_number) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        registration_number: validateRegistrationNumber(val),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    registration_number: validateRegistrationNumber(
                                        data.registration_number
                                    ),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.registration_number || errors.registration_number
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder="U12345MH2020PTC123456 / AAA-1234"
                            maxLength={21}
                        />
                        {/* Start Update 12 September 2026, by @WNP: Localize registration-number validation feedback. */}
                        {(clientErrors.registration_number || errors.registration_number) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.registration_number || errors.registration_number)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('GST Number')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.tax_id}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setData('tax_id', val);
                                if (clientErrors.tax_id) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        tax_id: validateGstNumber(val),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    tax_id: validateGstNumber(data.tax_id),
                                }));
                            }}
                            className={`w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                                clientErrors.tax_id || errors.tax_id
                                    ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                                    : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
                            }`}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                        />
                        {/* Start Update 12 September 2026, by @WNP: Localize tax-number validation feedback. */}
                        {(clientErrors.tax_id || errors.tax_id) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.tax_id || errors.tax_id)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('PAN Number')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.pan_number}
                            onChange={(e) => setData('pan_number', e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 bg-(--color-bg-primary) border border-(--color-border-primary) rounded-lg text-sm focus:border-(--color-border-focus) focus:ring-2 focus:ring-(--color-brand-primary)/20 outline-none transition-all"
                            placeholder="ABCDE1234F"
                            maxLength={10}
                            pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                            title="5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)"
                        />
                        {/* Start Update 12 September 2026, by @WNP: Localize PAN validation feedback. */}
                        {errors.pan_number && (
                            <p className="text-sm text-(--color-danger)">{t(errors.pan_number)}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Contact Person')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
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
                            placeholder={t('Full name of contact person')}
                        />
                        {/* Start Update 12 September 2026, by @WNP: Localize contact-person validation feedback. */}
                        {(clientErrors.contact_person || errors.contact_person) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.contact_person || errors.contact_person)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Phone Number / Mobile')}{' '}
                            <span className="text-(--color-danger)">*</span>
                        </label>
                        {/* Start Update 14 September 2026, by @WNP: Guide Indonesian mobile input without blocking the +62 alternative. */}
                        <input
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
                            placeholder="081234567890"
                        />
                        <p className="text-xs text-(--color-text-tertiary)">
                            {t('Use 08... or +628... for a mobile number.')}
                        </p>
                        {/* Start Update 12 September 2026, by @WNP: Localize contact-phone validation feedback. */}
                        {(clientErrors.contact_phone || errors.contact_phone) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.contact_phone || errors.contact_phone)}
                            </p>
                        )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Registered Address')}{' '}
                            <span className="text-(--color-danger)">*</span>
                        </label>
                        <textarea
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            className="w-full px-4 py-3 bg-(--color-bg-primary) border border-(--color-border-primary) rounded-lg text-sm focus:border-(--color-border-focus) focus:ring-2 focus:ring-(--color-brand-primary)/20 outline-none transition-all min-h-[80px]"
                            placeholder={t('Full street address')}
                        ></textarea>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {/* Start Update 11 September 2026, by @WNP: Use Indonesian address terminology for province selection. */}
                            {t('Province')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <FormSelect
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
                            error={clientErrors.state || errors.state}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {/* Start Update 11 September 2026, by @WNP: Include both Indonesian regencies and cities. */}
                            {t('Regency / City')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <FormSelect
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
                            disabled={!data.state}
                            error={clientErrors.city || errors.city}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {/* Start Update 11 September 2026, by @WNP: Use Indonesia's postal code label and five-digit input rules. */}
                            {t('Postal Code')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
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
                            placeholder="40115"
                        />
                        {/* Start Update 12 September 2026, by @WNP: Localize postal-code validation feedback. */}
                        {(clientErrors.pincode || errors.pincode) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.pincode || errors.pincode)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={processing}
                        className="bg-gradient-primary text-white font-semibold rounded-lg shadow-token-primary hover:-translate-y-px hover:shadow-token-primary transition-all flex items-center gap-2 text-lg px-8 py-3"
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
                    </button>
                </div>
            </form>
        </div>
    );
}
