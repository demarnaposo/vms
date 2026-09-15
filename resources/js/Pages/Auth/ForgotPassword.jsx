import { Link, useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import Logo from '@/Components/Logo';
// Start Update 11 September 2026, by @WNP: Enable bilingual password recovery and language selection.
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function ForgotPassword({ status }) {
    const { t } = useLanguage();
    const form = useForm({
        email: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post('/forgot-password');
    };

    return (
        <>
            <Head title={`${t('Forgot Password')} - VMS`} />
            <div className="min-h-screen flex items-center justify-center p-8 bg-(--color-bg-secondary)">
                {/* Start Update 11 September 2026, by @WNP: Keep language selection available during password recovery. */}
                <div className="fixed right-4 top-4 z-50">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Logo size="lg" />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-(--color-text-primary)">
                            {t('Reset Password')}
                        </h2>
                        <p className="text-(--color-text-tertiary) mt-2">
                            {t(
                                "Enter your email address and we'll send you a password reset link."
                            )}
                        </p>
                    </div>

                    {status && (
                        <div className="mb-4 p-4 rounded-lg bg-(--color-success-light) text-(--color-success-dark) text-sm">
                            {status}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                {t('Email')}
                            </label>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                placeholder="you@company.com"
                                required
                                autoFocus
                            />
                            {form.errors.email && (
                                <p className="mt-1 text-sm text-(--color-danger)">
                                    {form.errors.email}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full py-3 px-4 bg-(--color-brand-primary) hover:bg-(--color-brand-primary-hover) text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {form.processing ? t('Sending...') : t('Send Reset Link')}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-(--color-text-tertiary)">
                        {t('Remember your password?')}{' '}
                        <Link
                            href="/login"
                            className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) font-medium"
                        >
                            {t('Sign in')}
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
