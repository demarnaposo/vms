// Start Update 11 September 2026, by @WNP: Read centralized currency settings on the public About page.
import { Link, usePage } from '@inertiajs/react';
import AppIcon from '@/Components/AppIcon';
import GuestLayout from '@/Components/GuestLayout';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Start Update 11 September 2026, by @WNP: Translate the public About page from the global language state.
import { useLanguage } from '@/Contexts/LanguageContext';

const principles = [
    {
        title: 'Clarity First',
        description: 'Screens stay focused so teams can move quickly with less confusion.',
        icon: 'sparkles',
    },
    {
        title: 'Operational Control',
        description: 'All vendor data, approvals, and history live in one clean system.',
        icon: 'dashboard',
    },
    {
        title: 'Reliable Compliance',
        description: 'Automated checks reduce manual follow-up and audit risk.',
        icon: 'compliance',
    },
    {
        title: 'Fast Collaboration',
        description: 'Vendor, operations, and finance teams work from the same source of truth.',
        icon: 'messages',
    },
];

export default function About() {
    // Start Update 11 September 2026, by @WNP: Use the default currency shared by Laravel.
    const { currency } = usePage().props;
    // Start Update 11 September 2026, by @WNP: Resolve About-page copy through the bilingual dictionary.
    const { t } = useLanguage();

    return (
        <GuestLayout title="About - VendorFlow">
            <section className="py-16 lg:py-24">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    <div className="max-w-3xl animate-fade-in">
                        <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border-primary) bg-(--color-bg-primary)/80 px-4 py-2 text-sm text-(--color-text-secondary)">
                            <AppIcon name="info" className="h-4 w-4" />
                            <span>{t('About VendorFlow')}</span>
                        </div>
                        <h1 className="mt-6 text-4xl lg:text-5xl font-bold text-(--color-text-primary) leading-tight">
                            {t('We build vendor operations software that stays simple at scale.')}
                        </h1>
                        <p className="mt-5 text-lg text-(--color-text-tertiary)">
                            {t(
                                'VendorFlow helps teams replace scattered spreadsheets and email chains with one structured workflow for onboarding, compliance, and payments.'
                            )}
                        </p>
                    </div>

                    <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="surface-panel p-5">
                            <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                {t('Vendors Managed')}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-(--color-text-primary)">
                                10K+
                            </p>
                        </div>
                        <div className="surface-panel p-5">
                            <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                {t('Documents Tracked')}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-(--color-text-primary)">
                                500K+
                            </p>
                        </div>
                        <div className="surface-panel p-5">
                            <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                {t('Payment Value')}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-(--color-text-primary)">
                                {/* Start Update 11 September 2026, by @WNP: Replace crore notation with the full Indonesian-formatted amount. */}
                                {formatCurrency(2000000000, currency)}+
                            </p>
                        </div>
                        <div className="surface-panel p-5">
                            <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                {t('Team Satisfaction')}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-(--color-text-primary)">
                                98%
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pb-20">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    <h2 className="text-2xl lg:text-3xl font-bold text-(--color-text-primary)">
                        {t('Principles behind the product')}
                    </h2>
                    <div className="mt-8 grid sm:grid-cols-2 gap-4">
                        {principles.map((item) => (
                            <article key={item.title} className="surface-panel p-6">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-bg-tertiary) text-(--color-brand-primary)">
                                    <AppIcon name={item.icon} className="h-5 w-5" />
                                </span>
                                <h3 className="mt-4 text-lg font-semibold text-(--color-text-primary)">
                                    {t(item.title)}
                                </h3>
                                <p className="mt-2 text-sm text-(--color-text-tertiary)">
                                    {t(item.description)}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pb-20">
                <div className="max-w-4xl mx-auto px-6 lg:px-8">
                    <div className="surface-panel p-8 text-center">
                        <h2 className="text-3xl font-bold text-(--color-text-primary)">
                            {t('Want to see VendorFlow in action?')}
                        </h2>
                        <p className="mt-3 text-(--color-text-tertiary)">
                            {t('Explore the platform and tailor it to your workflows.')}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Link href="/register" className="btn-primary">
                                {t('Create Account')}
                            </Link>
                            <Link href="/contact" className="btn-secondary">
                                {t('Contact Team')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </GuestLayout>
    );
}
