import { paymentsEnabled } from '@/utils/paymentModule';
import { ActionLink, ActionButton, ActionAnchor } from '@/Components/ActionControls';
import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, StatCard, FormSelect, AppIcon } from '@/Components';
// Translate static report cards and scheduled-job descriptions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';

export default function ReportsIndex({ stats = {} }) {
    const [dateRange, setDateRange] = useState('this_month');
    // Resolve report dashboard copy using the selected language.
    const { t } = useLanguage();
    // Read the shared IDR settings supplied by Laravel.
    const { auth, currency, features } = usePage().props;
    const can = auth?.can || {};
    const enabled = paymentsEnabled(features);

    const reportTypes = [
        {
            id: 'vendor_summary',
            title: 'Vendor Summary',
            description: 'Overview of all vendors by status, compliance, and performance',
            icon: 'vendors',
            permission: 'vendors.view',
            route: '/admin/reports/vendor-summary',
        },
        {
            id: 'compliance_report',
            title: 'Compliance Report',
            description: 'Detailed compliance status and rule violations',
            icon: 'compliance',
            permission: 'compliance.view',
            route: '/admin/reports/compliance',
        },
        {
            id: 'payment_report',
            title: 'Payment Report',
            description: 'Payment requests, approvals, and disbursements',
            icon: 'payments',
            permission: 'payments.view',
            route: '/admin/reports/payment',
        },
        {
            id: 'document_expiry',
            title: 'Document Expiry Report',
            description: 'Documents expiring within selected date range',
            icon: 'documents',
            permission: 'documents.view',
            route: '/admin/reports/document-expiry',
        },
        {
            id: 'performance_report',
            title: 'Performance Report',
            description: 'Vendor performance scores and trends',
            icon: 'performance',
            permission: 'vendors.view',
            route: '/admin/reports/performance',
        },
        {
            id: 'audit_trail',
            title: 'Audit Trail Report',
            description: 'Complete history of all system activities',
            icon: 'audit',
            permission: 'audit.view',
            route: '/admin/audit',
        },
    ];

    const allowedReports = reportTypes.filter(
        (report) =>
            (enabled || report.id !== 'payment_report') &&
            (!report.permission || can[report.permission])
    );

    const dateOptions = [
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'This Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'this_quarter', label: 'This Quarter' },
        { value: 'this_year', label: 'This Year' },
    ];

    const header = (
        <PageHeader
            title="Reports"
            subtitle="Generate and download reports"
            actions={<FormSelect value={dateRange} onChange={setDateRange} options={dateOptions} />}
        />
    );

    return (
        <AdminLayout title="Reports" activeNav="Reports" header={header}>
            <div className="space-y-8">
                {/* Quick Stats - from backend */}
                <div className={`grid ${enabled ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
                    <StatCard
                        label="Total Vendors"
                        value={stats.total_vendors || 0}
                        icon="vendors"
                        color="primary"
                    />
                    <StatCard
                        label="Active Vendors"
                        value={stats.active_vendors || 0}
                        icon="success"
                        color="success"
                    />
                    <StatCard
                        label="Compliance Rate"
                        value={`${stats.compliance_rate || 0}%`}
                        icon="compliance"
                        color="info"
                    />
                    {enabled && (
                        <StatCard
                            label="Pending Payments"
                            value={stats.pending_payments || 0}
                            icon="clock"
                            color="warning"
                        />
                    )}
                    {enabled && (
                        <StatCard
                            label="Total Paid"
                            value={formatCurrency(stats.total_paid, currency)}
                            icon="payments"
                            color="success"
                        />
                    )}
                </div>

                {/* Available Reports */}
                <Card title="Available Reports">
                    {allowedReports.length > 0 ? (
                        <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allowedReports.map((report) => (
                                <div
                                    key={report.id}
                                    className="p-5 rounded-xl bg-(--color-bg-secondary) border border-(--color-border-secondary) hover:border-(--color-brand-primary-light) hover:shadow-lg transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-primary text-white flex items-center justify-center shadow-token-primary group-hover:scale-110 transition-transform">
                                            <AppIcon
                                                name={report.icon}
                                                className="h-6 w-6"
                                                fallback={
                                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                                        {report.icon}
                                                    </span>
                                                }
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-(--color-text-primary) font-semibold mb-1">
                                                {/* Translate fixed report names without changing route identifiers. */}
                                                {t(report.title)}
                                            </h3>
                                            <p className="text-sm text-(--color-text-tertiary)">
                                                {t(report.description)}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {report.route ? (
                                                    <ActionLink
                                                        variant="outline"
                                                        href={report.route}
                                                    >
                                                        {t('View')}
                                                    </ActionLink>
                                                ) : (
                                                    <ActionButton variant="outline" disabled>
                                                        View
                                                    </ActionButton>
                                                )}
                                                {can['reports.export'] && report.route && (
                                                    <ActionAnchor
                                                        variant="primary"
                                                        className="report-export-link"
                                                        href={`/admin/reports/export/${report.id.replace('_report', '')}`}
                                                    >
                                                        {t('Export CSV')}
                                                    </ActionAnchor>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-(--color-text-tertiary)">
                            {/* Localize the static report permission empty state. */}
                            {t('No reports available for your role.')}
                        </div>
                    )}
                </Card>

                {/* Scheduled Jobs */}
                <Card title="Scheduled Jobs">
                    <div className="p-4">
                        <p className="text-(--color-text-tertiary) text-sm mb-4">
                            {/* Translate scheduled-job guidance while retaining command text. */}
                            {t(
                                'These commands run automatically but can also be triggered manually:'
                            )}
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="relative p-4 rounded-xl overflow-hidden shadow-lg shadow-token-sm border border-(--color-brand-primary-light)">
                                <div
                                    className="absolute inset-0 opacity-50"
                                    style={{ background: 'var(--gradient-primary)' }}
                                />
                                <div className="relative z-10 text-(--color-text-primary)">
                                    {/* Translate fixed scheduled-job labels only. */}
                                    <div className="font-semibold mb-1">
                                        {t('Compliance Evaluation')}
                                    </div>
                                    <div className="text-xs text-(--color-text-secondary) mb-2">
                                        {t('Runs daily at 2:00 AM')}
                                    </div>
                                    <code className="text-xs bg-(--color-bg-primary)/60 px-2 py-1 rounded block text-(--color-text-primary)">
                                        php artisan vendors:evaluate-compliance
                                    </code>
                                </div>
                            </div>
                            <div className="relative p-4 rounded-xl overflow-hidden shadow-token-success border border-(--color-success)">
                                <div
                                    className="absolute inset-0 opacity-50"
                                    style={{ background: 'var(--gradient-success)' }}
                                />
                                <div className="relative z-10 text-(--color-text-primary)">
                                    {/* Translate fixed scheduled-job labels only. */}
                                    <div className="font-semibold mb-1">
                                        {t('Expiry Reminders')}
                                    </div>
                                    <div className="text-xs text-(--color-text-secondary) mb-2">
                                        {t('Runs daily at 8:00 AM')}
                                    </div>
                                    <code className="text-xs bg-(--color-bg-primary)/60 px-2 py-1 rounded block text-(--color-text-primary)">
                                        php artisan vendors:expiry-reminders
                                    </code>
                                </div>
                            </div>
                            <div className="relative p-4 rounded-xl overflow-hidden shadow-token-warning border border-(--color-warning)">
                                <div
                                    className="absolute inset-0 opacity-50"
                                    style={{ background: 'var(--gradient-warning)' }}
                                />
                                <div className="relative z-10 text-(--color-text-primary)">
                                    {/* Translate fixed scheduled-job labels only. */}
                                    <div className="font-semibold mb-1">{t('Weekly Summary')}</div>
                                    <div className="text-xs text-(--color-text-secondary) mb-2">
                                        {t('Runs every Monday')}
                                    </div>
                                    <code className="text-xs bg-(--color-bg-primary)/60 px-2 py-1 rounded block text-(--color-text-primary)">
                                        php artisan vendors:weekly-summary
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
