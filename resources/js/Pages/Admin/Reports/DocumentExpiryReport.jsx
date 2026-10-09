import { ActionButton, ActionLink } from '@/Components/ActionControls';
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, StatCard, Badge, DataTable, FormInput } from '@/Components';
// Translate fixed document master labels in the expiry report.
import { useLanguage } from '@/Contexts/LanguageContext';
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';

export default function DocumentExpiryReport({ documents, stats, filters }) {
    // Read the selected language for master document labels.
    const { language, t } = useLanguage();
    const { auth } = usePage().props;
    const can = auth?.can || {};

    const [localFilters, setLocalFilters] = useState({
        start_date: filters.start_date || '',
        end_date: filters.end_date || '',
    });

    const handleFilter = () => {
        router.get('/admin/reports/document-expiry', localFilters, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams(localFilters).toString();
        window.location.href = `/admin/reports/export/document_expiry?${params}`;
    };

    const getExpiryBadge = (daysUntil) => {
        if (daysUntil === null) return <Badge variant="default">Unknown</Badge>;
        if (daysUntil < 0) return <Badge variant="danger">Expired</Badge>;
        // Localize calculated day counts without translating document data.
        const daysLabel = t(':count days', { count: daysUntil });
        if (daysUntil <= 7) return <Badge variant="danger">{daysLabel}</Badge>;
        if (daysUntil <= 30) return <Badge variant="warning">{daysLabel}</Badge>;
        return <Badge variant="success">{daysLabel}</Badge>;
    };

    const columns = [
        {
            key: 'vendor',
            label: 'Vendor',
            render: (row) => (
                <span className="text-(--color-text-primary) font-medium">
                    {row.vendor?.company_name || 'N/A'}
                </span>
            ),
        },
        {
            key: 'document_type',
            label: 'Document Type',
            render: (row) => (
                <span className="text-(--color-text-secondary)">
                    {/* Translate recognized master types and retain custom report values. */}
                    {translateDocumentTypeLabel(language, row.document_type, 'N/A')}
                </span>
            ),
        },
        {
            key: 'file_name',
            label: 'File',
            render: (row) => <span className="text-(--color-text-secondary)">{row.file_name}</span>,
        },
        {
            key: 'expiry_date',
            label: 'Expiry Date',
            render: (row) => (
                <span className="text-(--color-text-primary)">{row.expiry_formatted}</span>
            ),
        },
        {
            key: 'days_until',
            label: 'Status',
            render: (row) => getExpiryBadge(row.days_until_expiry),
        },
    ];

    const header = (
        <PageHeader
            title="Document Expiry Report"
            subtitle="Documents expiring within selected date range"
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
        <AdminLayout title="Document Expiry Report" activeNav="Reports" header={header}>
            <div className="min-w-0 space-y-6">
                {/* Summary Stats */}
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 [&>div]:min-w-0 [&>div]:[overflow-wrap:anywhere]">
                    <StatCard
                        label="Expiring in 7 Days"
                        value={stats.expiring_7_days}
                        icon="warning"
                        color="danger"
                    />
                    <StatCard
                        label="Expiring in 30 Days"
                        value={stats.expiring_30_days}
                        icon="clock"
                        color="warning"
                    />
                    <StatCard
                        label="Already Expired"
                        value={stats.expired}
                        icon="error"
                        color="danger"
                    />
                    <StatCard
                        label="Total with Expiry"
                        value={stats.total_with_expiry}
                        icon="documents"
                        color="info"
                    />
                </div>

                {/* Filters */}
                <Card title="Date Range">
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
                        <div className="flex flex-wrap items-center gap-2">
                            <ActionButton
                                variant="outline"
                                onClick={handleFilter}
                                className="min-h-9 justify-center whitespace-normal"
                            >
                                Apply Filter
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
                {/* Translate the document count frame while retaining its numeric value. */}
                <Card
                    title={t('Expiring Documents (:count shown)', {
                        count: documents?.data?.length || 0,
                    })}
                >
                    <div className="min-w-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav_a]:min-h-9 [&_nav_a]:focus-visible:outline-2">
                        <DataTable
                            columns={columns}
                            data={documents?.data || []}
                            links={documents?.links || []}
                            emptyMessage="No documents found for the selected date range."
                        />
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
