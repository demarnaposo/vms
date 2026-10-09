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
    FormSelect,
} from '@/Components';
// Translate static compliance-report filters and count frames.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function ComplianceReport({ vendors, stats, filters }) {
    // Resolve report-only static copy in the selected language.
    const { t } = useLanguage();
    const { auth } = usePage().props;
    const can = auth?.can || {};

    const [localFilters, setLocalFilters] = useState({
        compliance_status: filters.compliance_status || 'all',
    });

    const handleFilter = () => {
        router.get('/admin/reports/compliance', localFilters, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams(localFilters).toString();
        window.location.href = `/admin/reports/export/compliance?${params}`;
    };

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'compliant', label: 'Compliant' },
        { value: 'non_compliant', label: 'Non-Compliant' },
        { value: 'pending', label: 'Pending' },
    ];

    const getComplianceBadge = (status) => {
        const variants = {
            compliant: 'success',
            non_compliant: 'danger',
            pending: 'warning',
        };
        return (
            <Badge variant={variants[status] || 'default'}>
                {(status || 'pending').replaceAll('_', ' ')}
            </Badge>
        );
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-(--color-success)';
        if (score >= 50) return 'text-(--color-warning)';
        return 'text-(--color-danger)';
    };

    const columns = [
        { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
        {
            key: 'company_name',
            label: 'Company',
            render: (row) => (
                <span className="text-(--color-text-primary) font-medium">{row.company_name}</span>
            ),
        },
        {
            key: 'compliance_status',
            label: 'Status',
            render: (row) => getComplianceBadge(row.compliance_status),
        },
        {
            key: 'compliance_score',
            label: 'Score',
            render: (row) => (
                <span className={`font-bold ${getScoreColor(row.compliance_score)}`}>
                    {row.compliance_score || 0}%
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Vendor Status',
            render: (row) => <Badge variant="info">{row.status}</Badge>,
        },
    ];

    const header = (
        <PageHeader
            title="Compliance Report"
            subtitle="Detailed compliance status and rule violations"
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
        <AdminLayout title="Compliance Report" activeNav="Reports" header={header}>
            <div className="min-w-0 space-y-6">
                {/* Summary Stats */}
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 [&>div]:min-w-0">
                    <StatCard
                        label="Total Vendors"
                        value={stats.total_vendors}
                        icon="vendors"
                        color="primary"
                    />
                    <StatCard
                        label="Compliant"
                        value={stats.compliant}
                        icon="success"
                        color="success"
                    />
                    <StatCard
                        label="Non-Compliant"
                        value={stats.non_compliant}
                        icon="error"
                        color="danger"
                    />
                    <StatCard label="Pending" value={stats.pending} icon="clock" color="warning" />
                    <StatCard
                        label="Avg Score"
                        value={`${stats.avg_score}%`}
                        icon="metrics"
                        color="info"
                    />
                </div>

                {/* Filters */}
                <Card title="Filters" allowOverflow>
                    <div className="flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:flex-wrap xl:items-end">
                        <div className="min-w-0 flex-1 xl:min-w-[200px]">
                            <FormSelect
                                label="Compliance Status"
                                value={localFilters.compliance_status}
                                onChange={(val) =>
                                    setLocalFilters({ ...localFilters, compliance_status: val })
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
                {/* Translate the report count frame while retaining its numeric value. */}
                <Card
                    title={t('Compliance Overview (:count shown)', {
                        count: vendors?.data?.length || 0,
                    })}
                >
                    <div className="min-w-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav_a]:min-h-9 [&_nav_a]:focus-visible:outline-2">
                        <DataTable
                            columns={columns}
                            data={vendors?.data || []}
                            links={vendors?.links || []}
                            emptyMessage="No vendors found for the selected filters."
                        />
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
