// Start Update 11 September 2026, by @WNP: Read centralized currency settings on the login page.
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Logo from '@/Components/Logo';
// Start Update 15 September 2026, by @WNP: Reuse the accessible password visibility input on login.
import PasswordInput from '@/Components/PasswordInput';
// Start Update 11 September 2026, by @WNP: Enable bilingual login content and language selection.
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';

export default function Login() {
    const { t } = useLanguage();
    // Start Update 11 September 2026, by @WNP: Use the default currency shared by Laravel.
    const { currency } = usePage().props;

    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post('/login');
    };

    return (
        <>
            <Head title={`${t('Login')} - VMS`} />
            <div className="min-h-screen flex">
                {/* Start Update 11 September 2026, by @WNP: Keep language selection available on the login page. */}
                <div className="fixed right-4 top-4 z-50">
                    <LanguageSwitcher />
                </div>
                <div className="hidden lg:flex lg:w-1/2 bg-(--color-brand-primary) relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <svg
                            className="w-full h-full"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <pattern
                                    id="grid"
                                    width="10"
                                    height="10"
                                    patternUnits="userSpaceOnUse"
                                >
                                    <path
                                        d="M 10 0 L 0 0 0 10"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="0.5"
                                    />
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#grid)" />
                        </svg>
                    </div>

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
                                {t('Manage your vendors with confidence')}
                            </h1>
                            <p className="text-white/90 text-lg leading-relaxed max-w-md">
                                {t(
                                    'Streamline onboarding, track compliance, and process payments - all from one powerful platform.'
                                )}
                            </p>

                            <div className="flex gap-8 pt-6">
                                <div>
                                    <div className="text-3xl font-bold">500+</div>
                                    <div className="text-white/80 text-sm">
                                        {t('Active Vendors')}
                                    </div>
                                </div>
                                <div>
                                    {/* Start Update 11 September 2026, by @WNP: Replace crore notation with the full Indonesian-formatted amount. */}
                                    <div className="text-3xl font-bold">
                                        {formatCurrency(100000000, currency)}+
                                    </div>
                                    <div className="text-white/80 text-sm">{t('Processed')}</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold">99.9%</div>
                                    <div className="text-white/80 text-sm">{t('Uptime')}</div>
                                </div>
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
                                {t('Welcome back')}
                            </h2>
                            <p className="text-(--color-text-tertiary) mt-2">
                                {t('Enter your credentials to access your account')}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                    {t('Email')}
                                </label>
                                {/* Start Update 15 September 2026, by @WNP: Localize the static email example on the login form. */}
                                <input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                    placeholder={t('you@company.com')}
                                    required
                                />
                                {form.errors.email && (
                                    <p className="mt-1 text-sm text-(--color-danger)">
                                        {form.errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                    {t('Password')}
                                </label>
                                {/* Start Update 15 September 2026, by @WNP: Let users show or hide the login password without changing its value. */}
                                <PasswordInput
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                    placeholder="********"
                                    autoComplete="current-password"
                                    required
                                />
                                {form.errors.password && (
                                    <p className="mt-1 text-sm text-(--color-danger)">
                                        {form.errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.remember}
                                        onChange={(e) => form.setData('remember', e.target.checked)}
                                        className="w-4 h-4 rounded border-(--color-border-primary) text-(--color-brand-primary) focus:ring-(--color-brand-primary)/20"
                                    />
                                    <span className="text-sm text-(--color-text-tertiary)">
                                        {t('Remember me')}
                                    </span>
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-(--color-brand-primary) hover:text-(--color-brand-primary-hover)"
                                >
                                    {t('Forgot password?')}
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full py-3 px-4 bg-(--color-brand-primary) hover:bg-(--color-brand-primary-hover) text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {form.processing ? t('Signing in...') : t('Sign in')}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-(--color-text-tertiary)">
                            {t("Don't have an account?")}{' '}
                            <Link
                                href="/register"
                                className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) font-medium"
                            >
                                {t('Create one')}
                            </Link>
                        </p>

                        {import.meta.env.DEV && (
                            <div className="mt-8 p-4 rounded-lg bg-(--color-bg-primary) border border-(--color-border-primary)">
                                <p className="text-xs font-medium text-(--color-text-tertiary) mb-2">
                                    {t('Demo Accounts')}
                                </p>
                                {/* Start Update 15 September 2026, by @WNP: Translate demo role labels without altering the actual credentials. */}
                                <div className="grid gap-1 text-xs text-(--color-text-muted)">
                                    <div>{t('Admin')}: admin@vendorflow.com / password</div>
                                    <div>{t('Ops')}: ops@vendorflow.com / password</div>
                                    <div>{t('Finance')}: finance@vendorflow.com / password</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
