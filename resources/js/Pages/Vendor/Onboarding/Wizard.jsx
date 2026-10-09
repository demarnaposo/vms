import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AppIcon } from '@/Components';
import StepBank from './Steps/StepBank';
import StepCompany from './Steps/StepCompany';
import StepDocuments from './Steps/StepDocuments';
import StepReview from './Steps/StepReview';
import Logo from '../../../Components/Logo.jsx';
// Enable bilingual onboarding navigation and progress labels.
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function Wizard({
    auth,
    currentStep = 1,
    vendor,
    documentTypes,
    vendorCategories = [],
    businessTypes = [],
    sessionData = {},
}) {
    const { t } = useLanguage();
    const { errors = {} } = usePage().props;
    const [step, setStep] = useState(currentStep);

    // Sync step with currentStep prop when it changes (e.g., after redirect)
    useEffect(() => {
        setStep(currentStep);
    }, [currentStep]);

    const steps = [
        { number: 1, title: 'Company Details' },
        { number: 2, title: 'Bank Information' },
        { number: 3, title: 'Documents' },
        { number: 4, title: 'Review and Submit' },
    ];

    return (
        <div className="min-h-screen bg-gradient-page">
            <Head title={t('Vendor Onboarding')} />

            {/* Navigation - Light Theme */}
            <nav className="border-b border-(--color-border-primary) bg-(--color-bg-primary)/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-3">
                            <Logo size="2xl" light={true} linkToHome={false} />
                        </Link>
                        <span className="font-bold text-sm sm:text-lg text-(--color-text-primary)">
                            | {t('Vendor Onboarding')}
                        </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-(--color-text-tertiary)">
                        <LanguageSwitcher compact />
                        <span className="min-w-0 wrap-anywhere">
                            {t('Welcome')}, {auth.user.name}
                        </span>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto min-w-0 px-4 sm:px-6 py-6 sm:py-12">
                {(errors.step || errors.error) && (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-(--color-danger) p-4 text-sm text-(--color-danger)"
                    >
                        {t(errors.step || errors.error)}
                    </p>
                )}
                {/* Progress Steps - Light Theme */}
                <div className="mb-12">
                    <div className="grid grid-cols-4 gap-2 items-start relative" role="list">
                        <div
                            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-(--color-bg-muted) -z-10 rounded-full"
                            aria-hidden="true"
                        ></div>
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-primary -z-10 rounded-full transition-all duration-500"
                            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                            aria-hidden="true"
                        ></div>

                        {steps.map((s) => (
                            <div
                                key={s.number}
                                className="flex min-w-0 flex-col items-center gap-2"
                                role="listitem"
                                aria-current={step === s.number ? 'step' : undefined}
                            >
                                <div
                                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl font-bold border-4 transition-all duration-300 ${
                                        step >= s.number
                                            ? 'bg-(--color-bg-primary) border-(--color-brand-primary) text-(--color-brand-primary)'
                                            : 'bg-(--color-bg-secondary) border-(--color-border-primary) text-(--color-text-muted)'
                                    } ${step === s.number ? 'shadow-token-primary scale-110' : ''}`}
                                    aria-hidden="true"
                                >
                                    {step > s.number ? (
                                        <AppIcon name="success" className="h-5 w-5" />
                                    ) : (
                                        s.number
                                    )}
                                </div>
                                <span
                                    className={`text-xs sm:text-sm break-words text-center font-medium ${step >= s.number ? 'text-(--color-text-primary)' : 'text-(--color-text-muted)'}`}
                                >
                                    {t(s.title)}
                                    <span className="sr-only">
                                        {step > s.number
                                            ? t('Completed')
                                            : step === s.number
                                              ? t('Current Step')
                                              : t('Pending')}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Steps Content */}
                {step === 1 && (
                    <StepCompany
                        vendor={vendor}
                        sessionData={sessionData}
                        vendorCategories={vendorCategories}
                        businessTypes={businessTypes}
                    />
                )}
                {step === 2 && <StepBank vendor={vendor} sessionData={sessionData} />}
                {step === 3 && (
                    <StepDocuments documentTypes={documentTypes} sessionData={sessionData} />
                )}
                {step === 4 && (
                    <StepReview
                        vendor={vendor}
                        sessionData={sessionData}
                        documentTypes={documentTypes}
                        vendorCategories={vendorCategories}
                        businessTypes={businessTypes}
                    />
                )}
            </main>
        </div>
    );
}
