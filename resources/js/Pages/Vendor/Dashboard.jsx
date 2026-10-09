import { paymentsEnabled } from '@/utils/paymentModule';
import { ActionLink } from '@/Components/ActionControls';
import { usePage } from '@inertiajs/react';
import { AppIcon, Badge, Card, PageHeader, VendorLayout } from '@/Components';
// Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Translate vendor dashboard status and actions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize fixed document master labels on the vendor dashboard.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';

export default function Dashboard({ vendor, recentDocuments = [], stats = {} }) {
    // Read the language used for system document types.
    const { language, t } = useLanguage();
    // Read the shared IDR settings supplied by Laravel.
    const { auth, currency, features } = usePage().props;
    const enabled = paymentsEnabled(features);
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
            message: enabled
                ? 'Your vendor account is active. You can now submit payment requests.'
                : 'Your vendor account is active.',
            action: null,
        },
        suspended: {
            title: 'Account Suspended',
            message: 'Your account has been suspended. Please contact support.',
            action: null,
        },
    };

    const currentStatus = statusMessages[displayVendor.status] || statusMessages.draft;

    // Translate the fixed vendor-status enum label in the dashboard header.
    const header = (
        <PageHeader
            title="Dashboard"
            subtitle={t('Welcome back, :name!', {
                name: user?.name?.split(' ')[0] || t('Vendor'),
            })}
            actions={
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    {displayVendor.vendor_number ? (
                        <span className="text-sm font-semibold text-(--color-text-secondary)">
                            {t('Vendor ID')}: {displayVendor.vendor_number}
                        </span>
                    ) : null}
                    <Badge status={displayVendor.status} size="lg" />
                </div>
            }
        />
    );

    return (
        <VendorLayout
            title="Vendor Dashboard"
            activeNav="Dashboard"
            header={header}
            vendor={displayVendor}
        >
            <div className="min-w-0 space-y-6">
                <div
                    className={`bg-(--color-bg-primary) border rounded-xl min-w-0 p-4 sm:p-6 shadow-token-sm border-l-4 ${
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
                        <ActionLink
                            href={currentStatus.link}
                            variant="primary"
                            className="min-h-9 justify-center whitespace-normal"
                        >
                            {/* Translate only the static onboarding action. */}
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
                        </ActionLink>
                    )}
                </div>

                {displayVendor.status !== 'draft' && (
                    <div
                        className={`grid ${enabled ? 'xl:grid-cols-3' : 'lg:grid-cols-2'} min-w-0 grid-cols-1 gap-4 [&>div]:min-w-0`}
                    >
                        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl min-w-0 p-4 sm:p-6 shadow-token-sm">
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 mb-4">
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

                        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl min-w-0 p-4 sm:p-6 shadow-token-sm">
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 mb-4">
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

                        {enabled && (
                            <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl min-w-0 p-4 sm:p-6 shadow-token-sm">
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 mb-4">
                                    <h3 className="font-semibold text-lg text-(--color-text-primary)">
                                        {t('Pending Payments')}
                                    </h3>
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-warning-light) text-(--color-warning)">
                                        <AppIcon name="payments" className="h-5 w-5" />
                                    </span>
                                </div>
                                <div className="text-4xl font-bold mb-2 text-(--color-text-primary)">
                                    {/* Format pending payments as IDR. */}
                                    {formatCurrency(stats.pending_payments, currency)}
                                </div>
                                {displayVendor.status === 'active' && (
                                    <ActionLink
                                        href="/vendor/payments"
                                        variant="primary"
                                        className="w-full min-h-9 mt-4 text-center justify-center whitespace-normal text-white!"
                                    >
                                        {/* Translate the payment request action. */}
                                        {t('Request Payment')}
                                    </ActionLink>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {recentDocuments.length > 0 && (
                    <Card
                        title="Recent Documents"
                        className="min-w-0 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3"
                        action={
                            <ActionLink
                                href="/vendor/documents"
                                variant="outline"
                                className="min-h-9 justify-center whitespace-normal"
                            >
                                {t('View All')}
                            </ActionLink>
                        }
                    >
                        <div className="divide-y divide-(--color-border-secondary)">
                            {recentDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 sm:p-4 hover:bg-(--color-bg-hover) transition-colors"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-bg-tertiary) text-(--color-brand-primary)">
                                            <AppIcon name="documents" className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 [overflow-wrap:anywhere]">
                                            <div className="text-(--color-text-primary) text-sm font-medium">
                                                {doc.file_name}
                                            </div>
                                            <div className="text-xs text-(--color-text-tertiary)">
                                                {/* Preserve custom types while translating master labels. */}
                                                {translateDocumentTypeLabel(
                                                    language,
                                                    doc.document_type
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Translate only the document verification enum label. */}
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
