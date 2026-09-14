import { Link, usePage } from '@inertiajs/react';
import { AdminLayout, AppIcon, Card, PageHeader, StatCard, StatGrid } from '@/Components';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Start Update 11 September 2026, by @WNP: Translate admin dashboard actions and empty states.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function AdminDashboard({
    stats = {},
    pendingVendors = [],
    pendingDocuments = [],
    pendingPayments = [],
}) {
    const { t } = useLanguage();
    // Start Update 11 September 2026, by @WNP: Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;

    const user = auth?.user;
    const can = auth?.can || {};

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
            // Start Update 11 September 2026, by @WNP: Format the approved amount with Indonesian separators.
            value: formatCurrency(stats.approved_payments, currency),
            icon: 'payments',
            color: 'success',
        },
    ];

    const header = (
        <PageHeader
            title="Dashboard"
            subtitle={t('Welcome back, :name!', {
                name: user?.name?.split(' ')[0] || 'Admin',
            })}
            actions={
                <Link href="/admin/vendors" className="btn-primary">
                    {t('View All Vendors')}
                </Link>
            }
        />
    );

    return (
        <AdminLayout title="Admin Dashboard" activeNav="Dashboard" header={header}>
            <div className="space-y-8">
                {/* Stats Grid */}
                <StatGrid cols={6}>
                    {statCards.map((stat) => (
                        <StatCard
                            key={stat.label}
                            {...stat}
                            className="h-full border border-(--color-border-primary)"
                        />
                    ))}
                </StatGrid>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Pending Vendor Applications */}
                    {can.approve_vendors && (
                        <Card
                            title={
                                <>
                                    <span className="mr-2 inline-flex align-middle">
                                        <AppIcon name="reports" className="h-4 w-4" />
                                    </span>
                                    {/* Start Update 12 September 2026, by @WNP: Translate the custom card title beside its icon. */}
                                    {t('Pending Vendor Applications')}
                                </>
                            }
                            actions={
                                <Link
                                    href="/admin/vendors?status=submitted"
                                    className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) text-sm font-medium"
                                >
                                    {t('View All')}
                                </Link>
                            }
                        >
                            <div className="divide-y divide-(--color-border-secondary)">
                                {pendingVendors.length > 0 ? (
                                    pendingVendors.map((vendor) => (
                                        <div
                                            key={vendor.id}
                                            className="px-5 py-4 flex items-center justify-between hover:bg-(--color-bg-hover) transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-(--color-brand-primary-light) flex items-center justify-center text-lg">
                                                    <AppIcon name="vendors" className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-(--color-text-primary)">
                                                        {vendor.company_name}
                                                    </div>
                                                    <div className="text-sm text-(--color-text-secondary)">
                                                        {vendor.contact_person}
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/admin/vendors/${vendor.id}`}
                                                className="inline-flex items-center px-4 py-2 bg-(--color-success) text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                            >
                                                {t('Review')}
                                            </Link>
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
                            title={
                                <>
                                    <span className="mr-2 inline-flex align-middle">
                                        <AppIcon name="documents" className="h-4 w-4" />
                                    </span>
                                    {/* Start Update 12 September 2026, by @WNP: Translate the custom document card title. */}
                                    {t('Documents Pending Verification')}
                                </>
                            }
                            actions={
                                <Link
                                    href="/admin/documents"
                                    className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) text-sm font-medium"
                                >
                                    {t('View All')}
                                </Link>
                            }
                        >
                            <div className="divide-y divide-(--color-border-secondary)">
                                {pendingDocuments.length > 0 ? (
                                    pendingDocuments.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="px-5 py-4 flex items-center justify-between hover:bg-(--color-bg-hover) transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl icon-bg-gradient-primary flex items-center justify-center text-lg">
                                                    <AppIcon name="documents" className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-(--color-text-primary)">
                                                        {doc.document_type}
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
                    {!can.approve_vendors && can.approve_payments && (
                        <Card
                            title={
                                <>
                                    <span className="mr-2 inline-flex align-middle">
                                        <AppIcon name="payments" className="h-4 w-4" />
                                    </span>
                                    {/* Start Update 12 September 2026, by @WNP: Translate the custom finance card title. */}
                                    {t('Pending Payment Approvals')}
                                </>
                            }
                            actions={
                                <Link
                                    href="/admin/payments?status=pending_finance"
                                    className="text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) text-sm font-medium"
                                >
                                    {t('View All')}
                                </Link>
                            }
                            className="lg:col-span-2 shadow-token-md border-(--color-brand-primary-light)"
                        >
                            <div className="divide-y divide-(--color-border-secondary)">
                                {pendingPayments.length > 0 ? (
                                    pendingPayments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="px-5 py-4 flex items-center justify-between hover:bg-(--color-bg-hover) transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl icon-bg-gradient-success flex items-center justify-center text-lg">
                                                    <AppIcon name="payments" className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-(--color-text-primary)">
                                                        {payment.vendor_name}
                                                    </div>
                                                    <div className="text-sm text-(--color-text-secondary)">
                                                        {/* Start Update 11 September 2026, by @WNP: Format pending payment amounts as IDR. */}
                                                        {formatCurrency(payment.amount, currency)} -{' '}
                                                        <span className="capitalize">
                                                            {payment.status.replaceAll('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/admin/payments/${payment.id}`}
                                                className="inline-flex items-center px-4 py-2 bg-(--color-brand-primary) text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                            >
                                                {/* Start Update 12 September 2026, by @WNP: Translate the payment review action. */}
                                                {t('Review')}
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-(--color-text-tertiary)">
                                        <span className="text-4xl mb-3 inline-flex justify-center w-full">
                                            <AppIcon name="success" className="h-10 w-10" />
                                        </span>
                                        {/* Start Update 12 September 2026, by @WNP: Translate the empty payment queue state. */}
                                        <p className="font-medium">{t('No pending payments')}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Quick Actions */}
                <Card title="Quick Actions">
                    <div className="p-4">
                        <div className="grid md:grid-cols-4 gap-4">
                            {can.approve_vendors && (
                                <Link
                                    href="/admin/vendors?status=submitted"
                                    className="p-4 rounded-xl bg-gradient-primary text-white flex flex-col items-center justify-center gap-2 group shadow-token-primary hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                        <AppIcon name="reports" className="h-6 w-6" />
                                    </span>
                                    <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                        {/* Start Update 12 September 2026, by @WNP: Translate the application shortcut. */}
                                        {t('Review Applications')}
                                    </span>
                                </Link>
                            )}
                            {can.run_compliance && (
                                <Link
                                    href="/admin/compliance"
                                    className="p-4 rounded-xl bg-gradient-success text-white flex flex-col items-center justify-center gap-2 group shadow-token-success hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                        <AppIcon name="compliance" className="h-6 w-6" />
                                    </span>
                                    <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                        {/* Start Update 12 September 2026, by @WNP: Translate the compliance shortcut. */}
                                        {t('Compliance Check')}
                                    </span>
                                </Link>
                            )}
                            <Link
                                href="/admin/payments"
                                className="p-4 rounded-xl bg-gradient-warning text-white flex flex-col items-center justify-center gap-2 group shadow-token-warning hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                    <AppIcon name="payments" className="h-6 w-6" />
                                </span>
                                <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                    {/* Start Update 12 September 2026, by @WNP: Translate role-specific payment shortcuts. */}
                                    {t(can.approve_payments ? 'Approve Payments' : 'View Payments')}
                                </span>
                            </Link>
                            <Link
                                href="/notifications"
                                className="p-4 rounded-xl bg-gradient-danger text-white flex flex-col items-center justify-center gap-2 group shadow-token-danger hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform inline-flex">
                                    <AppIcon name="notifications" className="h-6 w-6" />
                                </span>
                                <span className="text-sm font-bold tracking-wide uppercase opacity-95 text-center">
                                    {/* Start Update 12 September 2026, by @WNP: Translate the notifications shortcut. */}
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
