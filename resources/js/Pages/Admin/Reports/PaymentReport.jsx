import { ActionButton, ActionLink } from '@/Components/ActionControls';
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    AdminLayout,
    PageHeader,
    Card,
    StatCard,
    Badge,
    DataTable,
    FormInput,
    FormSelect,
} from '@/Components';
// Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
import { formatDate } from '@/utils/dateFormatters';
// Localize fixed report labels and dates while retaining payment records.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function PaymentReport({ payments, stats, filters }) {
    // Use the selected language for report copy and date display.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    // Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;
    const can = auth?.can || {};

    const [localFilters, setLocalFilters] = useState({
        start_date: filters.start_date || '',
        end_date: filters.end_date || '',
        status: filters.status || 'all',
    });

    const handleFilter = () => {
        router.get('/admin/reports/payment', localFilters, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams(localFilters).toString();
        window.location.href = `/admin/reports/export/payment?${params}`;
    };

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'requested', label: 'Requested' },
        { value: 'pending_ops', label: 'Pending Ops' },
        { value: 'pending_finance', label: 'Pending Finance' },
        { value: 'approved', label: 'Approved' },
        { value: 'paid', label: 'Paid' },
        { value: 'rejected', label: 'Rejected' },
    ];

    const getStatusBadge = (status) => {
        const variants = {
            requested: 'warning',
            pending_ops: 'warning',
            pending_finance: 'warning',
            approved: 'info',
            paid: 'success',
            rejected: 'danger',
        };
        return <Badge variant={variants[status] || 'default'}>{status.replaceAll('_', ' ')}</Badge>;
    };

    const columns = [
        { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
        { key: 'vendor', label: 'Vendor', render: (row) => row.vendor?.company_name || 'N/A' },
        { key: 'invoice_number', label: 'Invoice #', render: (row) => row.invoice_number || '-' },
        // Format report row values using centralized IDR settings.
        { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount, currency) },
        { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
        {
            key: 'created_at',
            label: 'Requested',
            // Format stored request dates using the selected locale.
            render: (row) => formatDate(row.created_at, dateLocale),
        },
    ];

    const header = (
        <PageHeader
            title="Payment Report"
            subtitle="View and export payment request data"
            actions={
                <ActionLink
                    variant="outline"
                    href="/admin/reports"
                    className="min-h-9 justify-center whitespace-normal"
                >
                    {t('Back to Reports')}
                </ActionLink>
            }
        />
    );

    return (
        <AdminLayout title="Payment Report" activeNav="Reports" header={header}>
            <div className="min-w-0 space-y-6">
                {/* Summary Stats */}
                {/* Format every payment summary amount with shared IDR settings. */}
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 [&>div]:min-w-0 [&>div]:[overflow-wrap:anywhere]">
                    <StatCard
                        label="Total Amount"
                        value={formatCurrency(stats.total_amount, currency)}
                        icon="payments"
                        color="primary"
                    />
                    <StatCard
                        label="Pending"
                        value={`${stats.pending_count} (${formatCurrency(stats.pending_amount, currency)})`}
                        icon="clock"
                        color="warning"
                    />
                    <StatCard
                        label="Approved"
                        value={`${stats.approved_count} (${formatCurrency(stats.approved_amount, currency)})`}
                        icon="success"
                        color="info"
                    />
                    <StatCard
                        label="Paid"
                        value={`${stats.paid_count} (${formatCurrency(stats.paid_amount, currency)})`}
                        icon="payments"
                        color="success"
                    />
                </div>

                {/* Filters */}
                <Card title="Filters" allowOverflow>
                    <div className="flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:flex-wrap xl:items-end">
                        <div className="min-w-0 flex-1 xl:min-w-[150px]">
                            <FormInput
                                label="Start Date"
                                type="date"
                                value={localFilters.start_date}
                                onChange={(value) =>
                                    setLocalFilters({ ...localFilters, start_date: value })
                                }
                            />
                        </div>
                        <div className="min-w-0 flex-1 xl:min-w-[150px]">
                            <FormInput
                                label="End Date"
                                type="date"
                                value={localFilters.end_date}
                                onChange={(value) =>
                                    setLocalFilters({ ...localFilters, end_date: value })
                                }
                            />
                        </div>
                        <div className="min-w-0 flex-1 xl:min-w-[150px]">
                            <FormSelect
                                label="Status"
                                value={localFilters.status}
                                onChange={(val) =>
                                    setLocalFilters({ ...localFilters, status: val })
                                }
                                options={statusOptions}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <ActionButton
                                variant="outline"
                                onClick={handleFilter}
                                className="min-h-9 justify-center whitespace-normal"
                            >
                                Apply Filters
                            </ActionButton>
                            {can['reports.export'] && (
                                <ActionButton
                                    variant="primary"
                                    onClick={handleExport}
                                    className="min-h-9 justify-center whitespace-normal"
                                >
                                    Export CSV
                                </ActionButton>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Data Table */}
                {/* Translate only the fixed report-count frame. */}
                <Card
                    title={t('Payment Records (:count shown)', {
                        count: payments?.data?.length || 0,
                    })}
                >
                    <div className="min-w-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav_a]:min-h-9 [&_nav_a]:focus-visible:outline-2">
                        <DataTable
                            columns={columns}
                            data={payments?.data || []}
                            links={payments?.links || []}
                            emptyMessage="No payment records found for the selected filters."
                        />
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
