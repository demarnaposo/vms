import { paymentsEnabled } from '@/utils/paymentModule';
import { ActionLink } from '@/Components/ActionControls';
import { Link, usePage } from '@inertiajs/react';
import { AdminLayout, AppIcon, Card, PageHeader, StatCard } from '@/Components';
// Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Translate admin dashboard actions and empty states.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize fixed document master labels on the dashboard.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';

export default function AdminDashboard({
    stats = {},
    pendingVendors = [],
    pendingDocuments = [],
    pendingPayments = [],
}) {
    // Read the language used for system document types.
    const { language, t } = useLanguage();
    // Read the shared IDR settings supplied by Laravel.
    const { auth, currency, features } = usePage().props;

    const enabled = paymentsEnabled(features);
    const user = auth?.user;
    const can = auth?.can || {};
    const quickActionColumns = enabled
        ? 'xl:grid-cols-4'
        : { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3' }[
              1 + Number(Boolean(can.approve_vendors)) + Number(Boolean(can.run_compliance))
          ];

    const statCards = [
        {
            label: 'Total Vendors',
            value: stats.total_vendors || 0,
            icon: 'vendors',
            color: 'primary',
        },
        {
            label: 'Active Vendors',
            value: stats.active_vendors || 0,
            icon: 'success',
            color: 'success',
        },
        {
            label: 'Pending Review',
            value: stats.pending_review || 0,
            icon: 'clock',
            color: 'warning',
        },
        {
            label: 'Non-Compliant',
            value: stats.non_compliant || 0,
            icon: 'warning',
            color: 'danger',
        },
        {
            label: 'Pending Payments',
            value: stats.pending_payments || 0,
            icon: 'payments',
            color: 'info',
        },
        {
            label: 'Approved Amount',
            // Format the approved amount with Indonesian separators.
            value: formatCurrency(stats.approved_payments, currency),
            icon: 'payments',
            color: 'success',
        },
    ];

    const header = (
        <PageHeader
            title="Dashboard"
            subtitle={
                <span className="min-w-0 [overflow-wrap:anywhere]">
                    {t('Welcome back, :name!', { name: user?.name?.split(' ')[0] || 'Admin' })}
                </span>
            }
            actions={
                can['vendors.view'] && (
                    <ActionLink
                        variant="primary"
                        href="/admin/vendors"
                        className="min-h-9 justify-center whitespace-normal"
                    >
                        {t('View All Vendors')}
                    </ActionLink>
                )
            }
        />
    );

    return (
        <AdminLayout title="Admin Dashboard" activeNav="Dashboard" header={header}>
            <div className="min-w-0 space-y-6">
                {/* Stats Grid */}
                <div
                    className={`grid min-w-0 grid-cols-1 sm:grid-cols-2 ${enabled ? 'xl:grid-cols-3 2xl:grid-cols-6' : 'xl:grid-cols-4'} gap-4 [&>div]:min-w-0`}
                >
                    {statCards
                        .filter(
                            (stat) =>
                                (enabled || stat.icon !== 'payments') &&
                                Object.hasOwn(
                                    stats,
                                    {
                                        'Total Vendors': 'total_vendors',
                                        'Active Vendors': 'active_vendors',
                                        'Pending Review': 'pending_review',
                                        'Non-Compliant': 'non_compliant',
                                        'Pending Payments': 'pending_payments',
                                        'Approved Amount': 'approved_payments',
                                    }[stat.label]
                                )
                        )
                        .map((stat) => (
                            <StatCard
                                key={stat.label}
                                {...stat}
                                className="min-w-0 h-full border border-(--color-border-primary) [&_.truncate]:whitespace-normal [&_.truncate]:overflow-visible [&_div]:[overflow-wrap:anywhere]"
                            />
                        ))}
                </div>

                <div
                    className={`grid ${enabled || (can.approve_vendors && can.verify_documents) ? 'xl:grid-cols-2' : ''} min-w-0 grid-cols-1 gap-6 [&>div]:min-w-0`}
                >
                    {/* Pending Vendor Applications */}
                    {can.approve_vendors && (
                        <Card
                            className="min-w-0 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child>h3]:min-w-0 [&>div:first-child>h3]:flex-wrap"
                            title={
                                <>
                                    <span className="mr-2 inline-flex align-middle">
                                        <AppIcon name="reports" className="h-4 w-4" />
                                    </span>
                                    {/* Translate the custom card title beside its icon. */}
                                    {t('Pending Vendor Applications')}
                                </>
                            }
                            actions={
                                <ActionLink
                                    variant="outline"
                                    href="/admin/vendors?status=submitted"
                                    className="min-h-9 justify-center whitespace-normal"
                                >
                                    {t('View All')}
                                </ActionLink>
                            }
                        >
                            <div className="divide-y divide-(--color-border-secondary)">
                                {pendingVendors.length > 0 ? (
                                    pendingVendors.map((vendor) => (
                                        <div
                                            key={vendor.id}
                                            className="p-3 sm:p-4 flex min-w-0 flex-wrap items-center justify-between gap-3 hover:bg-(--color-bg-hover) transition-colors"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-(--color-brand-primary-light) flex items-center justify-center text-lg">
                                                    <AppIcon name="vendors" className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 [overflow-wrap:anywhere]">
                                                    <div className="font-semibold text-(--color-text-primary)">
                                                        {vendor.company_name}
                                                    </div>
                                                    <div className="text-sm text-(--color-text-secondary)">
                                                        {vendor.contact_person}
                                                    </div>
                                                </div>
                                            </div>
                                            <ActionLink
                                                variant="outline"
                                                className="min-h-9 justify-center whitespace-normal"
                                                href={`/admin/vendors/${vendor.id}`}
                                            >
                                                {t('Review')}
                                            </ActionLink>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-(--color-text-tertiary)">
                                        <span className="text-4xl mb-3 inline-flex justify-center w-full">
                                            <AppIcon name="success" className="h-10 w-10" />
                                        </span>
                                        <p className="font-medium">
                                            {t('No pending applications')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Documents pending verification */}
                    {can.verify_documents && (
                        <Card
                            className="min-w-0 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child>h3]:min-w-0 [&>div:first-child>h3]:flex-wrap"
                            title={
                                <>
                                    <span className="mr-2 inline-flex align-middle">
                                        <AppIcon name="documents" className="h-4 w-4" />
                                    </span>
                                    {/* Translate the custom document card title. */}
                                    {t('Documents Pending Verification')}
                                </>
                            }
                            actions={
                                <ActionLink
                                    variant="outline"
                                    href="/admin/documents"
                                    className="min-h-9 justify-center whitespace-normal"
                                >
                                    {t('View All')}
                                </ActionLink>
                            }
                        >
                            <div className="divide-y divide-(--color-border-secondary)">
                                {pendingDocuments.length > 0 ? (
                                    pendingDocuments.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="p-3 sm:p-4 flex min-w-0 flex-wrap items-center justify-between gap-3 hover:bg-(--color-bg-hover) transition-colors"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-xl icon-bg-gradient-primary flex items-center justify-center text-lg">
                                                    <AppIcon name="documents" className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 [overflow-wrap:anywhere]">
                                                    <div className="font-semibold text-(--color-text-primary)">
                                                        {/* Translate only recognized system document types. */}
                                                        {translateDocumentTypeLabel(
                                                            language,
                                                            doc.document_type
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-(--color-text-secondary)">
                                                        {doc.vendor_name}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-(--color-text-tertiary)">
                                                {doc.uploaded_at}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-(--color-text-tertiary)">
                                        <span className="text-4xl mb-3 inline-flex justify-center w-full">
                                            <AppIcon name="success" className="h-10 w-10" />
                                        </span>
                                        <p className="font-medium">{t('All documents verified')}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Finance manager view */}
                    {enabled && !can.approve_vendors && can.approve_payments && (
                        <Card
                            className="min-w-0 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child>h3]:min-w-0 [&>div:first-child>h3]:flex-wrap xl:col-span-2 shadow-token-md border-(--color-brand-primary-light)"
                            title={
                                <>
                                    <span className="mr-2 inline-flex align-middle">
                                        <AppIcon name="payments" className="h-4 w-4" />
                                    </span>
                                    {/* Translate the custom finance card title. */}
                                    {t('Pending Payment Approvals')}
                                </>
                            }
                            actions={
                                <ActionLink
                                    variant="outline"
                                    href="/admin/payments?status=pending_finance"
                                    className="min-h-9 justify-center whitespace-normal"
                                >
                                    {t('View All')}
                                </ActionLink>
                            }
                        >
                            <div className="divide-y divide-(--color-border-secondary)">
                                {pendingPayments.length > 0 ? (
                                    pendingPayments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="p-3 sm:p-4 flex min-w-0 flex-wrap items-center justify-between gap-3 hover:bg-(--color-bg-hover) transition-colors"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-xl icon-bg-gradient-success flex items-center justify-center text-lg">
                                                    <AppIcon name="payments" className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 [overflow-wrap:anywhere]">
                                                    <div className="font-semibold text-(--color-text-primary)">
                                                        {payment.vendor_name}
                                                    </div>
                                                    <div className="text-sm text-(--color-text-secondary)">
                                                        {/* Format pending payment amounts as IDR. */}
                                                        {formatCurrency(payment.amount, currency)} -{' '}
                                                        <span className="capitalize">
                                                            {payment.status.replaceAll('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ActionLink
                                                variant="outline"
                                                className="min-h-9 justify-center whitespace-normal"
                                                href={`/admin/payments/${payment.id}`}
                                            >
                                                {/* Translate the payment review action. */}
                                                {t('Review')}
                                            </ActionLink>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-(--color-text-tertiary)">
                                        <span className="text-4xl mb-3 inline-flex justify-center w-full">
                                            <AppIcon name="success" className="h-10 w-10" />
                                        </span>
                                        {/* Translate the empty payment queue state. */}
                                        <p className="font-medium">{t('No pending payments')}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Quick Actions */}
                <Card title="Quick Actions" className="min-w-0">
                    <div className="min-w-0">
                        <div
                            className={`grid min-w-0 grid-cols-1 ${quickActionColumns} gap-4 [&>a]:min-w-0`}
                        >
                            {can.approve_vendors && (
                                <Link
                                    href="/admin/vendors?status=submitted"
                                    className="min-h-9 min-w-0 p-4 rounded-xl bg-gradient-primary text-white! flex flex-col items-center justify-center gap-2 group shadow-token-primary hover:shadow-xl hover:-translate-y-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                        <AppIcon name="reports" className="h-6 w-6" />
                                    </span>
                                    <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                        {/* Translate the application shortcut. */}
                                        {t('Review Applications')}
                                    </span>
                                </Link>
                            )}
                            {can.run_compliance && (
                                <Link
                                    href="/admin/compliance"
                                    className="min-h-9 min-w-0 p-4 rounded-xl bg-gradient-success text-white! flex flex-col items-center justify-center gap-2 group shadow-token-success hover:shadow-xl hover:-translate-y-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                        <AppIcon name="compliance" className="h-6 w-6" />
                                    </span>
                                    <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                        {/* Translate the compliance shortcut. */}
                                        {t('Compliance Check')}
                                    </span>
                                </Link>
                            )}
                            {enabled && (
                                <Link
                                    href="/admin/payments"
                                    className="min-h-9 min-w-0 p-4 rounded-xl bg-gradient-warning text-white! flex flex-col items-center justify-center gap-2 group shadow-token-warning hover:shadow-xl hover:-translate-y-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                        <AppIcon name="payments" className="h-6 w-6" />
                                    </span>
                                    <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                        {/* Translate role-specific payment shortcuts. */}
                                        {t(
                                            can.approve_payments
                                                ? 'Approve Payments'
                                                : 'View Payments'
                                        )}
                                    </span>
                                </Link>
                            )}
                            <Link
                                href="/notifications"
                                className="min-h-9 min-w-0 p-4 rounded-xl bg-gradient-danger text-white! flex flex-col items-center justify-center gap-2 group shadow-token-danger hover:shadow-xl hover:-translate-y-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                    <AppIcon name="notifications" className="h-6 w-6" />
                                </span>
                                <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                    {/* Translate the notifications shortcut. */}
                                    {t('Notifications')}
                                </span>
                            </Link>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
