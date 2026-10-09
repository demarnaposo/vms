import { DisabledButton } from '@/Components/DisabledActionTooltip';
import { paymentsEnabled } from '@/utils/paymentModule';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import Logo from '@/Components/Logo';
// Reuse the accessible password visibility input on registration.
import PasswordInput from '@/Components/PasswordInput';
// Enable bilingual registration content and language selection.
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function Register() {
    const { t } = useLanguage();
    const { features } = usePage().props;
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'vendor',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.processing) return;
        form.post('/register');
    };

    return (
        <>
            <Head title={t('Sign Up')} />
            <div className="min-h-screen flex">
                {/* Keep language selection available on the registration page. */}
                <div className="fixed right-4 top-4 z-50">
                    <LanguageSwitcher />
                </div>
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-(--color-bg-primary)/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-72 h-72 bg-(--color-bg-primary)/10 rounded-full translate-x-1/3 translate-y-1/3"></div>

                    <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-3 p-3 rounded-xl"
                            style={{
                                background:
                                    'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 27%, rgba(255,255,255,0) 100%)',
                            }}
                        >
                            <Logo size="2xl" light={false} linkToHome={false} />
                        </Link>

                        <div className="space-y-6">
                            <h1 className="text-4xl font-bold leading-tight">
                                {t('Join thousands of businesses')}
                            </h1>
                            <p className="text-white/90 text-lg leading-relaxed max-w-md">
                                {t(
                                    'Create your account and start managing vendors efficiently. Free to get started, upgrade anytime.'
                                )}
                            </p>

                            <div className="space-y-4 pt-6">
                                {[
                                    'Automated document verification',
                                    'Real-time compliance tracking',
                                    'Multi-level payment approvals',
                                    'Performance analytics dashboard',
                                ]
                                    .filter(
                                        (benefit) =>
                                            paymentsEnabled(features) ||
                                            benefit !== 'Multi-level payment approvals'
                                    )
                                    .map((benefit, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <svg
                                                className="w-5 h-5 text-(--color-success)"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span className="text-white/90">{t(benefit)}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="text-white/80 text-sm">
                            (c) 2026 VMS. {t('All rights reserved.')}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 bg-(--color-bg-secondary)">
                    <div className="w-full max-w-md">
                        <div className="lg:hidden flex justify-center mb-8">
                            <Logo size="lg" />
                        </div>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-(--color-text-primary)">
                                {t('Create your account')}
                            </h2>
                            <p className="text-(--color-text-tertiary) mt-2">
                                {t('Start managing vendors in minutes')}
                            </p>
                        </div>

                        <p className="mb-4 text-sm text-(--color-text-tertiary)">
                            {t('Fields marked with * are required.')}
                        </p>
                        <form noValidate onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="register-name"
                                    className="block text-sm font-medium text-(--color-text-secondary) mb-2"
                                >
                                    {t('Full Name')}
                                    <span className="text-(--color-danger)" aria-hidden="true">
                                        *
                                    </span>
                                </label>
                                {/* Localize the static full-name example on registration. */}
                                <input
                                    id="register-name"
                                    aria-invalid={Boolean(form.errors.name)}
                                    aria-describedby={
                                        form.errors.name ? 'register-name-error' : undefined
                                    }
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                    placeholder={t('John Doe')}
                                />
                                {form.errors.name && (
                                    <p
                                        id="register-name-error"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {form.errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="register-email"
                                    className="block text-sm font-medium text-(--color-text-secondary) mb-2"
                                >
                                    {t('Email')}
                                    <span className="text-(--color-danger)" aria-hidden="true">
                                        *
                                    </span>
                                </label>
                                {/* Localize the static email example on registration. */}
                                <input
                                    id="register-email"
                                    aria-invalid={Boolean(form.errors.email)}
                                    aria-describedby={
                                        form.errors.email ? 'register-email-error' : undefined
                                    }
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                    placeholder={t('you@company.com')}
                                />
                                {form.errors.email && (
                                    <p
                                        id="register-email-error"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {form.errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="register-password"
                                    className="block text-sm font-medium text-(--color-text-secondary) mb-2"
                                >
                                    {t('Password')}
                                    <span className="text-(--color-danger)" aria-hidden="true">
                                        *
                                    </span>
                                </label>
                                {/* Let users show or hide their new registration password. */}
                                <PasswordInput
                                    id="register-password"
                                    aria-invalid={Boolean(form.errors.password)}
                                    aria-describedby={
                                        form.errors.password ? 'register-password-error' : undefined
                                    }
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                    placeholder="Min 8 characters"
                                    autoComplete="new-password"
                                />
                                {form.errors.password && (
                                    <p
                                        id="register-password-error"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {form.errors.password}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="register-password-confirmation"
                                    className="block text-sm font-medium text-(--color-text-secondary) mb-2"
                                >
                                    {t('Confirm Password')}
                                    <span className="text-(--color-danger)" aria-hidden="true">
                                        *
                                    </span>
                                </label>
                                {/* Give password confirmation its own independent visibility control. */}
                                <PasswordInput
                                    id="register-password-confirmation"
                                    aria-invalid={Boolean(form.errors.password_confirmation)}
                                    aria-describedby={
                                        form.errors.password_confirmation
                                            ? 'register-password-confirmation-error'
                                            : undefined
                                    }
                                    value={form.data.password_confirmation}
                                    onChange={(e) =>
                                        form.setData('password_confirmation', e.target.value)
                                    }
                                    className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                    placeholder="Repeat password"
                                    autoComplete="new-password"
                                />
                                {form.errors.password_confirmation && (
                                    <p
                                        id="register-password-confirmation-error"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {form.errors.password_confirmation}
                                    </p>
                                )}
                            </div>

                            <DisabledButton
                                type="submit"
                                disabled={form.processing}
                                disabledReason={'A request is in progress. Please wait.'}
                                className="w-full py-3 px-4 theme-primary-action font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                            >
                                {form.processing ? t('Creating Account...') : t('Create Account')}
                            </DisabledButton>
                            <p className="text-center text-sm text-(--color-text-tertiary)">
                                {t('We will send a verification link to your email address.')}
                            </p>
                        </form>

                        <p className="mt-6 text-center text-(--color-text-tertiary)">
                            {t('Already have an account?')}{' '}
                            <Link
                                href="/login"
                                className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) font-medium"
                            >
                                {t('Sign in')}
                            </Link>
                        </p>

                        <p className="mt-6 text-center text-xs text-(--color-text-muted)">
                            {t('By creating an account, you agree to our')}{' '}
                            <Link
                                href="/terms"
                                className="text-(--color-text-tertiary) hover:text-(--color-text-primary)"
                            >
                                {t('Terms')}
                            </Link>{' '}
                            {t('and')}{' '}
                            <Link
                                href="/privacy"
                                className="text-(--color-text-tertiary) hover:text-(--color-text-primary)"
                            >
                                {t('Privacy Policy')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
