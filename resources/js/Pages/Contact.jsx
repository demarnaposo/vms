import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppIcon from '@/Components/AppIcon';
import GuestLayout from '@/Components/GuestLayout';
// Translate the contact experience with the global language state.
import { useLanguage } from '@/Contexts/LanguageContext';

const contactCards = [
    {
        title: 'Email',
        value: 'support@vendorflow.com',
        detail: 'Response within one business day',
        icon: 'messages',
    },
    {
        title: 'Phone',
        value: '+62 21 555 0123',
        detail: 'Mon-Fri, 9:00 AM to 6:00 PM WIB',
        icon: 'profile',
    },
    {
        title: 'Office',
        value: 'Jakarta, Indonesia',
        detail: 'Tech corridor, central operations hub',
        icon: 'system',
    },
];

export default function Contact() {
    // Resolve contact labels, validation feedback, and actions bilingually.
    const { t } = useLanguage();
    const { flash = {} } = usePage().props;
    const form = useForm({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const [emailError, setEmailError] = useState('');
    const [feedback, setFeedback] = useState(() => {
        if (flash.success) return { type: 'success', message: flash.success };
        if (flash.error) return { type: 'error', message: flash.error };

        return null;
    });

    // Validate email requires a proper domain with TLD (e.g., user@example.com)
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    useEffect(
        () =>
            router.on('exception', (event) => {
                event.preventDefault();
                setFeedback({
                    type: 'error',
                    message: t('Your message could not be sent. Please try again.'),
                });
            }),
        [t]
    );

    const handleSubmit = (event) => {
        event.preventDefault();
        setEmailError('');
        setFeedback(null);

        if (!isValidEmail(form.data.email)) {
            setEmailError(t('Please enter a valid email address (e.g., user@example.com).'));
            return;
        }

        form.post('/contact', {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash?.success) {
                    form.reset();
                    setFeedback({ type: 'success', message: page.props.flash.success });
                } else if (page.props.flash?.error) {
                    setFeedback({ type: 'error', message: page.props.flash.error });
                }
            },
            onError: (errors) => {
                if (Object.keys(errors).length === 0) {
                    setFeedback({
                        type: 'error',
                        message: t('Your message could not be sent. Please try again.'),
                    });
                }
            },
        });
    };

    return (
        <GuestLayout title="Contact">
            <section className="py-16 lg:py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-10">
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border-primary) bg-(--color-bg-primary)/80 px-4 py-2 text-sm text-(--color-text-secondary)">
                                    <AppIcon name="messages" className="h-4 w-4" />
                                    <span>{t('Contact VMS')}</span>
                                </div>
                                <h1 className="mt-6 text-4xl lg:text-5xl font-bold text-(--color-text-primary)">
                                    {t('Let us help you simplify vendor operations')}
                                </h1>
                                <p className="mt-4 text-lg text-(--color-text-tertiary)">
                                    {t(
                                        'Ask product questions, request a walkthrough, or share your requirements. We will get back quickly.'
                                    )}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {contactCards.map((card) => (
                                    <article key={card.title} className="surface-panel p-5">
                                        <div className="flex items-start gap-3">
                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-bg-tertiary) text-(--color-brand-primary)">
                                                <AppIcon name={card.icon} className="h-5 w-5" />
                                            </span>
                                            <div>
                                                <h2 className="text-sm font-semibold text-(--color-text-primary)">
                                                    {t(card.title)}
                                                </h2>
                                                <p className="text-base font-medium text-(--color-text-secondary)">
                                                    {card.value}
                                                </p>
                                                <p className="text-sm text-(--color-text-tertiary)">
                                                    {t(card.detail)}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="surface-panel p-6 lg:p-8 animate-scale-in">
                            <h2 className="text-2xl font-bold text-(--color-text-primary)">
                                {t('Send a message')}
                            </h2>
                            <p className="mt-2 text-sm text-(--color-text-tertiary)">
                                {t('Fields marked here are required.')}
                            </p>

                            {feedback?.type === 'success' && (
                                <div
                                    className="mt-5 rounded-xl border border-(--color-success) bg-(--color-success-light) p-4 text-sm font-medium text-(--color-success-dark)"
                                    role="status"
                                >
                                    {t(feedback.message)}
                                </div>
                            )}

                            {feedback?.type === 'error' && (
                                <div
                                    className="mt-5 rounded-xl border border-(--color-danger) bg-(--color-danger-light) p-4 text-sm font-medium text-(--color-danger-dark)"
                                    role="alert"
                                >
                                    {t(feedback.message)}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-(--color-text-secondary)">
                                            {t('Name')}
                                        </label>
                                        <input
                                            type="text"
                                            value={form.data.name}
                                            onChange={(event) =>
                                                form.setData('name', event.target.value)
                                            }
                                            className="input-field"
                                            placeholder={t('Your name')}
                                            required
                                        />
                                        {form.errors.name && (
                                            <p
                                                className="text-sm text-(--color-danger)"
                                                role="alert"
                                            >
                                                {t(form.errors.name)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-(--color-text-secondary)">
                                            {t('Email')}
                                        </label>
                                        <input
                                            type="email"
                                            value={form.data.email}
                                            onChange={(event) => {
                                                form.setData('email', event.target.value);
                                                if (emailError) setEmailError('');
                                            }}
                                            className="input-field"
                                            placeholder="you@company.com"
                                            pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                                            title={t(
                                                'Please enter a valid email (e.g., user@example.com)'
                                            )}
                                            required
                                        />
                                        {(emailError || form.errors.email) && (
                                            <p
                                                className="text-sm text-(--color-danger)"
                                                role="alert"
                                            >
                                                {emailError || t(form.errors.email)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Subject')}
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.subject}
                                        onChange={(event) =>
                                            form.setData('subject', event.target.value)
                                        }
                                        className="input-field"
                                        placeholder={t('What do you need help with?')}
                                        required
                                    />
                                    {form.errors.subject && (
                                        <p className="text-sm text-(--color-danger)" role="alert">
                                            {t(form.errors.subject)}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-(--color-text-secondary)">
                                        {t('Message')}
                                    </label>
                                    <textarea
                                        value={form.data.message}
                                        onChange={(event) =>
                                            form.setData('message', event.target.value)
                                        }
                                        rows={5}
                                        className="input-field resize-y"
                                        placeholder={t('Share your requirements')}
                                        required
                                    />
                                    {form.errors.message && (
                                        <p className="text-sm text-(--color-danger)" role="alert">
                                            {t(form.errors.message)}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="btn-primary w-full justify-center"
                                >
                                    {form.processing ? t('Sending...') : t('Send Message')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </GuestLayout>
    );
}
