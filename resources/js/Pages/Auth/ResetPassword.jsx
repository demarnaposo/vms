import { useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import Logo from '@/Components/Logo';
// Start Update 11 September 2026, by @WNP: Enable bilingual password reset content and language selection.
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function ResetPassword({ token, email }) {
    const { t } = useLanguage();
    const form = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post('/reset-password');
    };

    return (
        <>
            <Head title={`${t('Reset Password')} - VendorFlow`} />
            <div className="min-h-screen flex items-center justify-center p-8 bg-(--color-bg-secondary)">
                {/* Start Update 11 September 2026, by @WNP: Keep language selection available on the reset form. */}
                <div className="fixed right-4 top-4 z-50">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Logo size="lg" />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-(--color-text-primary)">
                            {t('Set New Password')}
                        </h2>
                        <p className="text-(--color-text-tertiary) mt-2">
                            {t('Enter your new password below.')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                {t('Email')}
                            </label>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary) opacity-70"
                                readOnly
                            />
                            {form.errors.email && (
                                <p className="mt-1 text-sm text-(--color-danger)">
                                    {form.errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                {t('New Password')}
                            </label>
                            <input
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                placeholder="********"
                                required
                                autoFocus
                            />
                            {form.errors.password && (
                                <p className="mt-1 text-sm text-(--color-danger)">
                                    {form.errors.password}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                {t('Confirm Password')}
                            </label>
                            <input
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(e) =>
                                    form.setData('password_confirmation', e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-lg border border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-2 focus:ring-(--color-brand-primary)/20 transition-colors bg-(--color-bg-primary)"
                                placeholder="********"
                                required
                            />
                            {form.errors.password_confirmation && (
                                <p className="mt-1 text-sm text-(--color-danger)">
                                    {form.errors.password_confirmation}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full py-3 px-4 bg-(--color-brand-primary) hover:bg-(--color-brand-primary-hover) text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {form.processing ? t('Resetting...') : t('Reset Password')}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
