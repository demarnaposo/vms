import { Link, usePage } from '@inertiajs/react';
import AppIcon from '@/Components/AppIcon';
import GuestLayout from '@/Components/GuestLayout';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Start Update 11 September 2026, by @WNP: Translate the public landing page with the global language preference.
import { useLanguage } from '@/Contexts/LanguageContext';

const featureCards = [
    {
        title: 'Vendor Onboarding',
        description: 'Collect profiles and documents with guided steps.',
        icon: 'onboarding',
    },
    {
        title: 'Document Tracking',
        description: 'Watch expiry dates and verification status in real time.',
        icon: 'documents',
    },
    {
        title: 'Compliance Checks',
        description: 'Run policy rules and keep every vendor audit ready.',
        icon: 'compliance',
    },
    {
        title: 'Payment Flow',
        description: 'Route approvals from request to paid with full visibility.',
        icon: 'payments',
    },
    {
        title: 'Performance Metrics',
        description: 'Score vendor performance and spot risks early.',
        icon: 'metrics',
    },
    {
        title: 'Operational Reports',
        description: 'Export clear summaries for finance and operations teams.',
        icon: 'reports',
    },
];

export default function Welcome() {
    // Start Update 11 September 2026, by @WNP: Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;
    // Start Update 11 September 2026, by @WNP: Resolve prominent landing-page copy through the bilingual dictionary.
    const { t } = useLanguage();

    return (
        <GuestLayout title="VMS - Clean Vendor Operations">
            <section className="relative py-16 lg:py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-10 items-center">
                        <div className="space-y-7 animate-fade-in">
                            <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border-primary) bg-(--color-bg-primary)/80 px-4 py-2 text-sm text-(--color-text-secondary)">
                                <span className="inline-flex h-2 w-2 rounded-full bg-(--color-success)" />
                                <span>{t('Built for vendor, ops, and finance teams')}</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-(--color-text-primary)">
                                {t('Vendor operations')}
                                <span className="block text-gradient">{t('without clutter')}</span>
                            </h1>

                            <p className="max-w-xl text-lg text-(--color-text-tertiary)">
                                {t(
                                    'Manage onboarding, compliance, and payment approvals from one unified workspace with cleaner workflows and faster decisions.'
                                )}
                            </p>

                            <div className="flex flex-wrap gap-3">
                                {auth?.user ? (
                                    <Link href="/dashboard" className="btn-primary">
                                        {t('Open Dashboard')}
                                        <AppIcon name="trend" className="h-4 w-4" />
                                    </Link>
                                ) : (
                                    <>
                                        <Link href="/register" className="btn-primary">
                                            {t('Get Started')}
                                            <AppIcon name="trend" className="h-4 w-4" />
                                        </Link>
                                        <Link href="/login" className="btn-secondary">
                                            {t('Sign In')}
                                        </Link>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                                <div className="surface-panel p-4">
                                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {t('Active Vendors')}
                                    </p>
                                    <p className="text-2xl font-bold text-(--color-text-primary)">
                                        500+
                                    </p>
                                </div>
                                <div className="surface-panel p-4">
                                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {t('Documents')}
                                    </p>
                                    <p className="text-2xl font-bold text-(--color-text-primary)">
                                        50K+
                                    </p>
                                </div>
                                <div className="surface-panel p-4 col-span-2 sm:col-span-1">
                                    <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {t('Payment Value')}
                                    </p>
                                    <p className="text-2xl font-bold text-(--color-text-primary)">
                                        {/* Start Update 11 September 2026, by @WNP: Replace crore notation with the full Indonesian-formatted amount. */}
                                        {formatCurrency(120000000, currency)}+
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 animate-scale-in">
                            <div className="surface-panel p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-(--color-text-primary)">
                                        {t('Today Snapshot')}
                                    </h3>
                                    <span className="text-xs text-(--color-text-tertiary)">
                                        {t('Live')}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-xl bg-(--color-bg-secondary) px-3 py-2">
                                        <span className="text-sm text-(--color-text-secondary)">
                                            {t('Vendor Submissions')}
                                        </span>
                                        <span className="text-sm font-semibold text-(--color-text-primary)">
                                            14
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl bg-(--color-bg-secondary) px-3 py-2">
                                        <span className="text-sm text-(--color-text-secondary)">
                                            {t('Documents Pending')}
                                        </span>
                                        <span className="text-sm font-semibold text-(--color-text-primary)">
                                            28
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl bg-(--color-bg-secondary) px-3 py-2">
                                        <span className="text-sm text-(--color-text-secondary)">
                                            {t('Payments Awaiting')}
                                        </span>
                                        <span className="text-sm font-semibold text-(--color-text-primary)">
                                            9
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="surface-panel p-5">
                                <h3 className="text-sm font-semibold text-(--color-text-primary) mb-3">
                                    {t('Team Confidence')}
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs text-(--color-text-tertiary) mb-1">
                                            <span>{t('Compliance coverage')}</span>
                                            <span>94%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-(--color-bg-tertiary)">
                                            <div
                                                className="h-2 rounded-full"
                                                style={{
                                                    width: '94%',
                                                    background: 'var(--gradient-primary)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-(--color-text-tertiary) mb-1">
                                            <span>{t('Payment turnaround')}</span>
                                            <span>88%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-(--color-bg-tertiary)">
                                            <div
                                                className="h-2 rounded-full"
                                                style={{
                                                    width: '88%',
                                                    background: 'var(--gradient-success)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-14 lg:py-18">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-(--color-text-primary)">
                            {t('Focused tools, no extra noise')}
                        </h2>
                        <p className="mt-2 text-(--color-text-tertiary)">
                            {t('Every module is designed to keep the workflow clear.')}
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featureCards.map((feature) => (
                            <article key={feature.title} className="surface-panel p-5">
                                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-bg-tertiary) text-(--color-brand-primary)">
                                    <AppIcon name={feature.icon} className="h-5 w-5" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-(--color-text-primary)">
                                    {t(feature.title)}
                                </h3>
                                <p className="mt-2 text-sm text-(--color-text-tertiary)">
                                    {t(feature.description)}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pb-20 pt-6">
                <div className="max-w-4xl mx-auto px-6 lg:px-8">
                    <div className="surface-panel p-8 lg:p-10 text-center">
                        <h2 className="text-3xl font-bold text-(--color-text-primary)">
                            {t('Ready to clean up your vendor workflow?')}
                        </h2>
                        <p className="mt-3 text-(--color-text-tertiary)">
                            {t('Start with a lightweight setup and scale as your operations grow.')}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            {!auth?.user ? (
                                <>
                                    <Link href="/register" className="btn-primary">
                                        {t('Start Free')}
                                    </Link>
                                    <Link href="/contact" className="btn-secondary">
                                        {t('Talk to Team')}
                                    </Link>
                                </>
                            ) : (
                                <Link href="/dashboard" className="btn-primary">
                                    {t('Continue to Dashboard')}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </GuestLayout>
    );
}
