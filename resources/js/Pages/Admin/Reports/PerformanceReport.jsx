import { ActionButton, ActionLink } from '@/Components/ActionControls';
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, StatCard, Badge, DataTable, FormInput } from '@/Components';
// Translate static performance report labels while retaining stored vendor values.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function PerformanceReport({ vendors, stats, filters }) {
    // Resolve fixed score-band and ranking labels in the selected language.
    const { t } = useLanguage();
    const { auth } = usePage().props;
    const can = auth?.can || {};

    const [localFilters, setLocalFilters] = useState({
        min_score: filters.min_score || '',
    });

    const handleFilter = () => {
        router.get('/admin/reports/performance', localFilters, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams(localFilters).toString();
        window.location.href = `/admin/reports/export/performance?${params}`;
    };

    const getPerformanceBadge = (score) => {
        // Translate only calculated category labels, not score values.
        if (score >= 80)
            return (
                <Badge variant="success">
                    {score}% - {t('High')}
                </Badge>
            );
        if (score >= 50)
            return (
                <Badge variant="warning">
                    {score}% - {t('Medium')}
                </Badge>
            );
        return (
            <Badge variant="danger">
                {score}% - {t('Low')}
            </Badge>
        );
    };

    const columns = [
        { key: 'rank', label: 'Rank', render: (row, idx) => `#${idx + 1}` },
        { key: 'company_name', label: 'Company', render: (row) => row.company_name },
        {
            key: 'performance_score',
            label: 'Performance',
            render: (row) => getPerformanceBadge(row.performance_score || 0),
        },
        {
            key: 'compliance_score',
            label: 'Compliance Score',
            render: (row) => `${row.compliance_score || 0}%`,
        },
        {
            key: 'status',
            label: 'Status',
            // Translate the lifecycle enum label without changing its stored code.
            render: (row) => (
                <Badge variant="success">{row.status?.replaceAll('_', ' ') || 'Unknown'}</Badge>
            ),
        },
    ];

    const header = (
        <PageHeader
            title="Performance Report"
            subtitle="Vendor performance scores and rankings"
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
        <AdminLayout title="Performance Report" activeNav="Reports" header={header}>
            <div className="min-w-0 space-y-6">
                {/* Summary Stats */}
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 [&>div]:min-w-0 [&>div]:[overflow-wrap:anywhere]">
                    <StatCard
                        label="Active Vendors"
                        value={stats.total_active}
                        icon="vendors"
                        color="primary"
                    />
                    <StatCard
                        label="Avg Performance"
                        value={`${stats.avg_performance}%`}
                        icon="metrics"
                        color="info"
                    />
                    <StatCard
                        label="High Performers (>=80%)"
                        value={stats.high_performers}
                        icon="metrics"
                        color="success"
                    />
                    <StatCard
                        label="Top Performer"
                        value={stats.top_scorer}
                        icon="success"
                        color="warning"
                    />
                </div>

                {/* Performance Distribution */}
                <Card title="Performance Distribution">
                    <div className="grid min-w-0 grid-cols-1 xl:grid-cols-3 gap-4 [&>div]:min-w-0">
                        <div className="p-4 rounded-xl bg-(--color-success-light) border border-(--color-success)/20 text-center">
                            <div className="text-3xl font-bold text-(--color-success)">
                                {stats.high_performers}
                            </div>
                            <div className="text-sm text-(--color-text-secondary)">
                                {/* Translate the fixed distribution bucket. */}
                                {t('High Performers (>=80%)')}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-(--color-warning-light) border border-(--color-warning)/20 text-center">
                            <div className="text-3xl font-bold text-(--color-warning)">
                                {stats.medium_performers}
                            </div>
                            <div className="text-sm text-(--color-text-secondary)">
                                {/* Translate the fixed distribution bucket. */}
                                {t('Medium Performers (50-79%)')}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-(--color-danger-light) border border-(--color-danger)/20 text-center">
                            <div className="text-3xl font-bold text-(--color-danger)">
                                {stats.low_performers}
                            </div>
                            <div className="text-sm text-(--color-text-secondary)">
                                {/* Translate the fixed distribution bucket. */}
                                {t('Low Performers (<50%)')}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Filters */}
                <Card title="Filters">
                    <div className="flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:flex-wrap xl:items-end">
                        <div className="min-w-0 flex-1 xl:min-w-[150px]">
                            <FormInput
                                label="Minimum Score"
                                type="number"
                                min="0"
                                max="100"
                                placeholder="e.g. 50"
                                value={localFilters.min_score}
                                onChange={(value) =>
                                    setLocalFilters({ ...localFilters, min_score: value })
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
                {/* Localize the fixed ranking count frame. */}
                <Card
                    title={t('Performance Rankings (:count shown)', {
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
