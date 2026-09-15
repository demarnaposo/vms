import { Link, usePage } from '@inertiajs/react';
import { AppIcon, Badge, Card, LinkButton, PageHeader, VendorLayout } from '@/Components';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Start Update 11 September 2026, by @WNP: Translate vendor dashboard status and actions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 15 September 2026, by @WNP: Localize fixed document master labels on the vendor dashboard.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';

export default function Dashboard({ vendor, recentDocuments = [], stats = {} }) {
    // Start Update 15 September 2026, by @WNP: Read the language used for system document types.
    const { language, t } = useLanguage();
    // Start Update 11 September 2026, by @WNP: Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;
    const user = auth?.user;

    const displayVendor = vendor || {
        status: 'draft',
        compliance_score: 0,
        performance_score: 0,
    };

    const statusMessages = {
        draft: {
            title: 'Complete Your Profile',
            message: 'Your vendor profile is incomplete. Please complete the onboarding process.',
            action: 'Continue Onboarding',
            link: '/vendor/onboarding',
        },
        submitted: {
            title: 'Application Under Review',
            message:
                'Your application has been submitted and is pending review by our operations team.',
            action: null,
        },
        under_review: {
            title: 'Application Being Reviewed',
            message: 'Our team is currently reviewing your application and documents.',
            action: null,
        },
        approved: {
            title: 'Application Approved',
            message: 'Your vendor account has been approved. Awaiting activation.',
            action: null,
        },
        active: {
            title: 'Account Active',
            message: 'Your vendor account is active. You can now submit payment requests.',
            action: null,
        },
        suspended: {
            title: 'Account Suspended',
            message: 'Your account has been suspended. Please contact support.',
            action: null,
        },
    };

    const currentStatus = statusMessages[displayVendor.status] || statusMessages.draft;

    // Start Update 13 September 2026, by @WNP: Translate the fixed vendor-status enum label in the dashboard header.
    const header = (
        <PageHeader
            title="Dashboard"
            subtitle={t('Welcome back, :name!', {
                name: user?.name?.split(' ')[0] || t('Vendor'),
            })}
            actions={<Badge status={displayVendor.status} size="lg" />}
        />
    );

    return (
        <VendorLayout
            title="Vendor Dashboard"
            activeNav="Dashboard"
            header={header}
            vendor={displayVendor}
        >
            <div className="space-y-8">
                <div
                    className={`bg-(--color-bg-primary) border rounded-xl p-6 shadow-token-sm border-l-4 ${
                        displayVendor.status === 'active'
                            ? 'border-l-(--color-success)'
                            : displayVendor.status === 'suspended'
                              ? 'border-l-(--color-danger)'
                              : displayVendor.status === 'draft'
                                ? 'border-l-(--color-text-muted)'
                                : 'border-l-(--color-warning)'
                    } border-(--color-border-primary)`}
                >
                    <h3 className="text-lg font-semibold text-(--color-text-primary) mb-2">
                        {t(currentStatus.title)}
                    </h3>
                    <p className="text-(--color-text-tertiary) mb-4">{t(currentStatus.message)}</p>
                    {currentStatus.action && (
                        <LinkButton
                            href={currentStatus.link}
                            variant="primary"
                            className="inline-flex items-center gap-2"
                        >
                            {/* Start Update 12 September 2026, by @WNP: Translate only the static onboarding action. */}
                            {t(currentStatus.action)}
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                            </svg>
                        </LinkButton>
                    )}
                </div>

                {displayVendor.status !== 'draft' && (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-6 shadow-token-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-(--color-text-primary)">
                                    {t('Compliance')}
                                </h3>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-brand-primary-light) text-(--color-brand-primary)">
                                    <AppIcon name="compliance" className="h-5 w-5" />
                                </span>
                            </div>
                            <div
                                className={`text-4xl font-bold mb-2 ${
                                    displayVendor.compliance_score >= 80
                                        ? 'text-(--color-success)'
                                        : displayVendor.compliance_score >= 50
                                          ? 'text-(--color-warning)'
                                          : 'text-(--color-danger)'
                                }`}
                            >
                                {displayVendor.compliance_score || 0}%
                            </div>
                            <div className="w-full bg-(--color-bg-tertiary) rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${
                                        displayVendor.compliance_score >= 80
                                            ? 'bg-(--color-success)'
                                            : displayVendor.compliance_score >= 50
                                              ? 'bg-(--color-warning)'
                                              : 'bg-(--color-danger)'
                                    }`}
                                    style={{ width: `${displayVendor.compliance_score || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-6 shadow-token-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-(--color-text-primary)">
                                    {t('Performance')}
                                </h3>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-info-light) text-(--color-info)">
                                    <AppIcon name="trend" className="h-5 w-5" />
                                </span>
                            </div>
                            <div className="text-4xl font-bold mb-2 text-(--color-brand-primary)">
                                {displayVendor.performance_score || 0}/100
                            </div>
                            <p className="text-sm text-(--color-text-tertiary)">
                                {t('Based on delivery and quality metrics')}
                            </p>
                        </div>

                        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-6 shadow-token-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-(--color-text-primary)">
                                    {t('Pending Payments')}
                                </h3>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-warning-light) text-(--color-warning)">
                                    <AppIcon name="payments" className="h-5 w-5" />
                                </span>
                            </div>
                            <div className="text-4xl font-bold mb-2 text-(--color-text-primary)">
                                {/* Start Update 11 September 2026, by @WNP: Format pending payments as IDR. */}
                                {formatCurrency(stats.pending_payments, currency)}
                            </div>
                            {displayVendor.status === 'active' && (
                                <LinkButton
                                    href="/vendor/payments"
                                    variant="primary"
                                    className="w-full mt-4 text-center justify-center block"
                                >
                                    {/* Start Update 12 September 2026, by @WNP: Translate the payment request action. */}
                                    {t('Request Payment')}
                                </LinkButton>
                            )}
                        </div>
                    </div>
                )}

                {recentDocuments.length > 0 && (
                    <Card
                        title="Recent Documents"
                        action={
                            <Link
                                href="/vendor/documents"
                                className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) text-sm font-medium"
                            >
                                {t('View All')}
                            </Link>
                        }
                    >
                        <div className="divide-y divide-(--color-border-secondary)">
                            {recentDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 hover:bg-(--color-bg-hover) transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-(--color-bg-tertiary) text-(--color-brand-primary)">
                                            <AppIcon name="documents" className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <div className="text-(--color-text-primary) text-sm font-medium">
                                                {doc.file_name}
                                            </div>
                                            <div className="text-xs text-(--color-text-tertiary)">
                                                {/* Start Update 15 September 2026, by @WNP: Preserve custom types while translating master labels. */}
                                                {translateDocumentTypeLabel(
                                                    language,
                                                    doc.document_type
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Start Update 13 September 2026, by @WNP: Translate only the document verification enum label. */}
                                    <Badge status={doc.verification_status} />
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </VendorLayout>
    );
}
