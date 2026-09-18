import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, StatCard, Button, FormSelect, AppIcon } from '@/Components';
// Start Update 16 September 2026, by @WNP: Translate static report cards and scheduled-job descriptions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';

export default function ReportsIndex({ stats = {} }) {
    const [dateRange, setDateRange] = useState('this_month');
    // Start Update 16 September 2026, by @WNP: Resolve report dashboard copy using the selected language.
    const { t } = useLanguage();
    // Start Update 11 September 2026, by @WNP: Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;
    const can = auth?.can || {};

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
        (report) => !report.permission || can[report.permission]
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
                <div className="grid md:grid-cols-5 gap-4">
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
                    <StatCard
                        label="Pending Payments"
                        value={stats.pending_payments || 0}
                        icon="clock"
                        color="warning"
                    />
                    {/* Start Update 11 September 2026, by @WNP: Replace Indian lakh notation with a complete IDR value. */}
                    <StatCard
                        label="Total Paid"
                        value={formatCurrency(stats.total_paid, currency)}
                        icon="payments"
                        color="success"
                    />
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
                                        <div className="w-12 h-12 rounded-xl bg-gradient-primary text-(--color-text-primary) flex items-center justify-center shadow-token-primary group-hover:scale-110 transition-transform">
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
                                                {/* Start Update 16 September 2026, by @WNP: Translate fixed report names without changing route identifiers. */}
                                                {t(report.title)}
                                            </h3>
                                            <p className="text-sm text-(--color-text-tertiary)">
                                                {t(report.description)}
                                            </p>
                                            <div className="flex gap-2 mt-3">
                                                {report.route ? (
                                                    <Link href={report.route}>
                                                        <Button variant="ghost" size="sm">
                                                            View
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button variant="ghost" size="sm" disabled>
                                                        View
                                                    </Button>
                                                )}
                                                {can['reports.export'] && report.route && (
                                                    <a
                                                        href={`/admin/reports/export/${report.id.replace('_report', '')}`}
                                                    >
                                                        <Button variant="secondary" size="sm">
                                                            Export CSV
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-(--color-text-tertiary)">
                            {/* Start Update 16 September 2026, by @WNP: Localize the static report permission empty state. */}
                            {t('No reports available for your role.')}
                        </div>
                    )}
                </Card>

                {/* Scheduled Jobs */}
                <Card title="Scheduled Jobs">
                    <div className="p-4">
                        <p className="text-(--color-text-tertiary) text-sm mb-4">
                            {/* Start Update 16 September 2026, by @WNP: Translate scheduled-job guidance while retaining command text. */}
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
                                    {/* Start Update 16 September 2026, by @WNP: Translate fixed scheduled-job labels only. */}
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
                                    {/* Start Update 16 September 2026, by @WNP: Translate fixed scheduled-job labels only. */}
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
                                    {/* Start Update 16 September 2026, by @WNP: Translate fixed scheduled-job labels only. */}
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
