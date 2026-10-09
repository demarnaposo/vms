import { ActionLink } from '@/Components/ActionControls';
import { AdminLayout, PageHeader, DataTable, Badge, AppIcon } from '@/Components';
// Localize fixed performance labels without translating database metric content.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize recognized performance metric master records.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

export default function PerformanceIndex({
    vendors = [],
    metrics = [],
    topPerformers = [],
    lowPerformers = [],
}) {
    // Resolve only static score and empty-state copy through the shared locale.
    // Read the selected language for performance master data.
    const { language, t } = useLanguage();
    const getScoreColor = (score) => {
        if (score >= 80) return 'text-(--color-success)';
        if (score >= 60) return 'text-(--color-warning)';
        if (score >= 40) return 'text-(--color-warning-dark)';
        return 'text-(--color-danger)';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'bg-(--color-success)';
        if (score >= 60) return 'bg-(--color-warning)';
        if (score >= 40) return 'bg-(--color-warning-dark)';
        return 'bg-(--color-danger)';
    };

    const columns = [
        {
            header: 'Vendor',
            render: (row) => (
                <span className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                    {row.company_name}
                </span>
            ),
        },
        {
            header: 'Score',
            align: 'center',
            render: (row) => (
                <span className={`text-xl font-bold ${getScoreColor(row.performance_score)}`}>
                    {row.performance_score}
                </span>
            ),
        },
        {
            header: 'Progress',
            render: (row) => (
                <div className="w-full bg-(--color-bg-tertiary) rounded-full h-2 max-w-[150px]">
                    <div
                        className={`h-2 rounded-full ${getScoreBg(row.performance_score)}`}
                        style={{ width: `${row.performance_score}%` }}
                    />
                </div>
            ),
        },
        { header: 'Compliance', render: (row) => <Badge status={row.compliance_status} /> },
        {
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                    <ActionLink
                        href={`/admin/performance/${row.id}`}
                        variant="outline"
                        className="min-h-9 justify-center"
                    >
                        {t('View')}
                    </ActionLink>
                    <ActionLink
                        href={`/admin/performance/${row.id}/rate`}
                        variant="primary"
                        className="min-h-9 justify-center"
                    >
                        {t('Rate')}
                    </ActionLink>
                </div>
            ),
        },
    ];

    const header = (
        <PageHeader title="Performance Dashboard" subtitle="Track and rate vendor performance" />
    );

    return (
        <AdminLayout title="Performance Dashboard" activeNav="Performance" header={header}>
            <div className="min-w-0 space-y-6">
                <div className="bg-(--color-bg-primary) rounded-xl border border-(--color-border-primary) shadow-sm min-w-0 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-(--color-text-primary) mb-4">
                        {/* Translate the fixed section heading. */}
                        {t('Performance Metrics')}
                    </h2>
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>div]:min-w-0">
                        {metrics.map((metric) => (
                            <div
                                key={metric.id}
                                className="p-4 rounded-lg bg-(--color-bg-secondary) border border-(--color-border-secondary)"
                            >
                                <div className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                    {/* Translate fixed metric labels and preserve custom metrics. */}
                                    {translateSystemMasterDataField(
                                        language,
                                        'performance_metrics',
                                        metric,
                                        'display_name'
                                    )}
                                </div>
                                <div className="[overflow-wrap:anywhere] text-sm text-(--color-text-tertiary) mt-1">
                                    {/* Translate only fixed metric descriptions. */}
                                    {translateSystemMasterDataField(
                                        language,
                                        'performance_metrics',
                                        metric,
                                        'description'
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-xs text-(--color-brand-primary)">
                                        {/* Translate the fixed weight label, not metric data. */}
                                        {t('Weight: :weight%', {
                                            weight: new Intl.NumberFormat(
                                                language === 'id' ? 'id-ID' : 'en-US'
                                            ).format(Number(metric.weight)),
                                        })}
                                    </span>
                                    <span className="text-xs text-(--color-text-tertiary)">
                                        {/* Translate the fixed maximum-score label. */}
                                        {t('Max: :score', { score: metric.max_score })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 [&>div]:min-w-0">
                    <div className="bg-(--color-bg-primary) rounded-xl border border-(--color-border-primary) shadow-sm min-w-0 p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
                            {/* Translate the fixed ranking heading. */}
                            <AppIcon name="metrics" className="h-5 w-5" /> {t('Top Performers')}
                        </h2>
                        <div className="space-y-3">
                            {topPerformers.map((vendor, idx) => (
                                <div
                                    key={vendor.id}
                                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-(--color-bg-secondary) border border-(--color-border-secondary)"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-(--color-warning-light) flex items-center justify-center text-(--color-warning) font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <span className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                            {vendor.company_name}
                                        </span>
                                    </div>
                                    <span
                                        className={`text-xl font-bold ${getScoreColor(vendor.performance_score)}`}
                                    >
                                        {vendor.performance_score}
                                    </span>
                                </div>
                            ))}
                            {topPerformers.length === 0 && (
                                <div className="text-center text-(--color-text-tertiary) py-4">
                                    {/* Translate the fixed empty state. */}
                                    {t('No data yet')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-(--color-bg-primary) rounded-xl border border-(--color-border-primary) shadow-sm min-w-0 p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
                            {/* Translate the fixed improvement heading. */}
                            <AppIcon name="warning" className="h-5 w-5" /> {t('Needs Improvement')}
                        </h2>
                        <div className="space-y-3">
                            {lowPerformers.map((vendor) => (
                                <div
                                    key={vendor.id}
                                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-(--color-bg-secondary) border border-(--color-border-secondary)"
                                >
                                    <span className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                        {vendor.company_name}
                                    </span>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span
                                            className={`text-xl font-bold ${getScoreColor(vendor.performance_score)}`}
                                        >
                                            {vendor.performance_score}
                                        </span>
                                        <ActionLink
                                            href={`/admin/performance/${vendor.id}/rate`}
                                            variant="primary"
                                            className="min-h-9 justify-center"
                                        >
                                            {t('Rate')}
                                        </ActionLink>
                                    </div>
                                </div>
                            ))}
                            {lowPerformers.length === 0 && (
                                <div className="text-center text-(--color-text-tertiary) py-4">
                                    {/* Translate the fixed empty state. */}
                                    {t('No data yet')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="min-w-0 [&_table]:min-w-[720px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere]">
                    <DataTable
                        columns={columns}
                        data={vendors}
                        emptyMessage="No approved or active vendors available for rating"
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
