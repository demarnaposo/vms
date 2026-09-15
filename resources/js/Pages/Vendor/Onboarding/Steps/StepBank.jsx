import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
// Start Update 11 September 2026, by @WNP: Resolve Indonesian bank names locally from three-digit transfer codes.
import { findIndonesianBankByCode } from '@/data/indonesianBanks';
// Start Update 11 September 2026, by @WNP: Translate the bank onboarding step through the global language context.
import { useLanguage } from '@/Contexts/LanguageContext';

// Start Update 11 September 2026, by @WNP: Use Indonesia's three-digit bank transfer code format.
const BANK_CODE_REGEX = /^[0-9]{3}$/;

export default function StepBank({ vendor, sessionData }) {
    const { t } = useLanguage();
    const step2Session = sessionData?.step2 || {};
    const { data, setData, post, processing, errors } = useForm({
        bank_name: step2Session.bank_name || vendor?.bank_name || '',
        bank_account_number: step2Session.bank_account_number || vendor?.bank_account_number || '',
        bank_ifsc: step2Session.bank_ifsc || vendor?.bank_ifsc || '',
        bank_branch: step2Session.bank_branch || vendor?.bank_branch || '',
    });

    const [clientErrors, setClientErrors] = useState({});
    // Start Update 11 September 2026, by @WNP: Derive bank resolution during render without extra state or external requests.
    const resolvedBank = findIndonesianBankByCode(data.bank_ifsc);

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

    // Start Update 11 September 2026, by @WNP: Auto-fill a known Indonesian bank name locally while keeping branch entry manual.
    const handleBankCodeChange = (e) => {
        const code = e.target.value.replace(/\D/g, '').slice(0, 3);
        const bank = findIndonesianBankByCode(code);
        setData((prev) => ({
            ...prev,
            bank_ifsc: code,
            bank_name: bank?.name || (resolvedBank ? '' : prev.bank_name),
        }));

        if (clientErrors.bank_ifsc) {
            setClientErrors((prev) => ({
                ...prev,
                bank_ifsc: validateBankCode(code),
            }));
        }
    };

    const handleBankCodeBlur = () => {
        const bankCodeError = validateBankCode(data.bank_ifsc);
        setClientErrors((prev) => ({ ...prev, bank_ifsc: bankCodeError }));
    };

    const submit = (e) => {
        e.preventDefault();

        const nameErr = validateBankName(data.bank_name);
        const accErr = validateAccountNumber(data.bank_account_number);
        const bankCodeError = validateBankCode(data.bank_ifsc);
        const branchErr = validateBranch(data.bank_branch);

        if (nameErr || accErr || bankCodeError || branchErr) {
            setClientErrors({
                bank_name: nameErr,
                bank_account_number: accErr,
                bank_ifsc: bankCodeError,
                bank_branch: branchErr,
            });
            return;
        }

        setClientErrors({});
        post('/vendor/onboarding/step2');
    };

    const fieldClass = (field) =>
        `w-full px-4 py-3 bg-(--color-bg-primary) border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
            clientErrors[field] || errors[field]
                ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20'
                : 'border-(--color-border-primary) focus:border-(--color-border-focus) focus:ring-(--color-brand-primary)/20'
        }`;

    return (
        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-2xl p-8 md:p-12 shadow-token-lg animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-(--color-text-primary)">
                    {t('Bank Information')}
                </h1>
                <p className="text-(--color-text-tertiary)">
                    {t('Add your bank details for payment processing.')}
                </p>
            </div>

            <form onSubmit={submit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Bank Name')} <span className="text-(--color-danger)">*</span>
                        </label>
                        {/* Start Update 11 September 2026, by @WNP: Use an Indonesian bank example and lock locally resolved names. */}
                        <input
                            type="text"
                            value={data.bank_name}
                            onChange={(e) => {
                                setData('bank_name', e.target.value);
                                if (clientErrors.bank_name) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        bank_name: validateBankName(e.target.value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    bank_name: validateBankName(data.bank_name),
                                }));
                            }}
                            className={`${fieldClass('bank_name')} ${resolvedBank ? 'bg-(--color-bg-secondary)' : ''}`}
                            placeholder={t('e.g., Bank Mandiri')}
                            readOnly={Boolean(resolvedBank)}
                        />
                        {(clientErrors.bank_name || errors.bank_name) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.bank_name || errors.bank_name)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Account Number')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.bank_account_number}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setData('bank_account_number', val);
                                if (clientErrors.bank_account_number) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        bank_account_number: validateAccountNumber(val),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    bank_account_number: validateAccountNumber(
                                        data.bank_account_number
                                    ),
                                }));
                            }}
                            className={fieldClass('bank_account_number')}
                            placeholder={t('9-18 digit account number')}
                            maxLength={18}
                        />
                        {(clientErrors.bank_account_number || errors.bank_account_number) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.bank_account_number || errors.bank_account_number)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {/* Start Update 11 September 2026, by @WNP: Use Indonesian Bank Code terminology. */}
                            {t('Bank Code')} <span className="text-(--color-danger)">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={data.bank_ifsc}
                                onChange={handleBankCodeChange}
                                onBlur={handleBankCodeBlur}
                                className={`${fieldClass('bank_ifsc')} pr-10`}
                                placeholder="008"
                                inputMode="numeric"
                                maxLength={3}
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
                        {(clientErrors.bank_ifsc || errors.bank_ifsc) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.bank_ifsc || errors.bank_ifsc)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-secondary)">
                            {t('Branch Name')} <span className="text-(--color-danger)">*</span>
                        </label>
                        {/* Start Update 11 September 2026, by @WNP: Keep branch manual because Indonesian bank codes identify banks, not individual branches. */}
                        <input
                            type="text"
                            value={data.bank_branch}
                            onChange={(e) => {
                                setData('bank_branch', e.target.value);
                                if (clientErrors.bank_branch) {
                                    setClientErrors((prev) => ({
                                        ...prev,
                                        bank_branch: validateBranch(e.target.value),
                                    }));
                                }
                            }}
                            onBlur={() => {
                                setClientErrors((prev) => ({
                                    ...prev,
                                    bank_branch: validateBranch(data.bank_branch),
                                }));
                            }}
                            className={fieldClass('bank_branch')}
                            placeholder={t('e.g., KCP Jakarta Menteng')}
                        />
                        <p className="text-xs text-(--color-text-tertiary)">
                            {t('Enter the branch registered for this account.')}
                        </p>
                        {(clientErrors.bank_branch || errors.bank_branch) && (
                            <p className="text-sm text-(--color-danger)">
                                {t(clientErrors.bank_branch || errors.bank_branch)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <button
                        type="button"
                        onClick={() => router.get('/vendor/onboarding?step=1')}
                        className="px-6 py-3 rounded-xl border border-(--color-border-primary) text-(--color-text-secondary) hover:bg-(--color-bg-hover) transition-colors font-medium"
                    >
                        {t('Back')}
                    </button>
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
