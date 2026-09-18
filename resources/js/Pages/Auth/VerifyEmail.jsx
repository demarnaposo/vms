import { Head, router, useForm } from '@inertiajs/react';
import Logo from '@/Components/Logo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function VerifyEmail({ email, status }) {
    const { t } = useLanguage();
    const resendForm = useForm({});

    const resend = (event) => {
        event.preventDefault();
        resendForm.post('/email/verification-notification');
    };

    return (
        <>
            <Head title={`${t('Verify Email Address')} - VMS`} />
            <div className="min-h-screen flex items-center justify-center p-8 bg-(--color-bg-secondary)">
                <div className="fixed right-4 top-4 z-50">
                    <LanguageSwitcher />
                </div>
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Logo size="lg" />
                    </div>

                    <h1 className="text-2xl font-bold text-(--color-text-primary) mb-3">
                        {t('Verify Email Address')}
                    </h1>
                    <p className="text-(--color-text-tertiary) mb-4">
                        {t('A verification link has been sent to :email. Follow it to continue.', {
                            email,
                        })}
                    </p>
                    <p className="text-(--color-text-tertiary) mb-6">
                        {t('Check your inbox and spam folder. The link expires in 60 minutes.')}
                    </p>

                    {status === 'verification-link-sent' && (
                        <p
                            role="status"
                            className="mb-5 rounded-lg bg-(--color-success-light) p-4 text-sm text-(--color-success-dark)"
                        >
                            {t('A new verification link has been sent to your email address.')}
                        </p>
                    )}

                    <form onSubmit={resend}>
                        <button
                            type="submit"
                            disabled={resendForm.processing}
                            className="w-full rounded-lg bg-(--color-brand-primary) px-4 py-3 font-semibold text-white transition-colors hover:bg-(--color-brand-primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {resendForm.processing
                                ? t('Sending...')
                                : t('Resend Verification Email')}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="mt-4 w-full rounded-lg border border-(--color-border-primary) px-4 py-3 font-medium text-(--color-text-secondary) transition-colors hover:bg-(--color-bg-tertiary)"
                    >
                        {t('Log Out')}
                    </button>
                </div>
            </div>
        </>
    );
}
